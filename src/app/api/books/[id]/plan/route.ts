import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateCompletionDate, estimateReadingHours } from "@/lib/reading";

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const FALLBACK_SCHEDULE = {
  monHours: 1,
  tueHours: 1,
  wedHours: 1,
  thuHours: 1,
  friHours: 1,
  satHours: 1,
  sunHours: 1
};

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

  const startDate = new Date(`${parsed.data.startDate}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }

  const [book, latestSpeedTest, userSettings] = await Promise.all([
    prisma.book.findFirst({
      where: {
        id,
        userId: user.id
      }
    }),
    prisma.readingSpeedTest.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id } })
  ]);

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (!latestSpeedTest) {
    return NextResponse.json({ error: "Complete the reading speed test first" }, { status: 400 });
  }

  const schedule = userSettings ?? FALLBACK_SCHEDULE;
  const requiredHours = estimateReadingHours(book.wordCount, latestSpeedTest.wordsPerMin);
  const completionDate = estimateCompletionDate(requiredHours, schedule, startDate);

  const plan = await prisma.readingPlan.upsert({
    where: { bookId: id },
    create: {
      bookId: id,
      startDate,
      requiredHours,
      estimatedEndDate: completionDate,
      monHours: schedule.monHours,
      tueHours: schedule.tueHours,
      wedHours: schedule.wedHours,
      thuHours: schedule.thuHours,
      friHours: schedule.friHours,
      satHours: schedule.satHours,
      sunHours: schedule.sunHours
    },
    update: {
      startDate,
      requiredHours,
      estimatedEndDate: completionDate,
      monHours: schedule.monHours,
      tueHours: schedule.tueHours,
      wedHours: schedule.wedHours,
      thuHours: schedule.thuHours,
      friHours: schedule.friHours,
      satHours: schedule.satHours,
      sunHours: schedule.sunHours
    }
  });

  return NextResponse.json({ plan });
}
