import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysBetweenInclusive, estimatePagesPerMinute } from "@/lib/reading";

const schema = z.object({
  finishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const finishedAt = new Date(`${parsed.data.finishedDate}T00:00:00`);
  if (Number.isNaN(finishedAt.getTime())) {
    return NextResponse.json({ error: "Invalid finish date" }, { status: 400 });
  }

  const [book, latestSpeedTest, existingPlan] = await Promise.all([
    prisma.book.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        estimatedPages: true,
        createdAt: true
      }
    }),
    prisma.readingSpeedTest.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    }),
    prisma.readingPlan.findUnique({ where: { bookId: id } })
  ]);

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const startDate = existingPlan?.startDate ?? book.createdAt;

  if (finishedAt < startDate) {
    return NextResponse.json({ error: "Finish date cannot be earlier than start date" }, { status: 400 });
  }

  const plan = await prisma.$transaction(async (tx) => {
    const updatedPlan = await tx.readingPlan.upsert({
      where: { bookId: id },
      create: {
        bookId: id,
        startDate,
        finishedAt,
        requiredHours: 0,
        monHours: 0,
        tueHours: 0,
        wedHours: 0,
        thuHours: 0,
        friHours: 0,
        satHours: 0,
        sunHours: 0
      },
      update: {
        finishedAt
      }
    });

    await tx.bookChapter.updateMany({
      where: { bookId: id },
      data: {
        isRead: true,
        readAt: finishedAt
      }
    });

    return updatedPlan;
  });

  const actualDays = daysBetweenInclusive(startDate, finishedAt);
  const pagesPerMinute = estimatePagesPerMinute(latestSpeedTest?.wordsPerMin ?? 0);
  const pagesPerDay = actualDays > 0 ? book.estimatedPages / actualDays : 0;

  return NextResponse.json({
    plan,
    stats: {
      actualDays,
      pagesPerDay,
      pagesPerMinute
    }
  });
}
