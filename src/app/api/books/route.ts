import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateReadingHours } from "@/lib/reading";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [books, latestTest] = await Promise.all([
    prisma.book.findMany({
      where: { userId: user.id },
      include: { plans: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.readingSpeedTest.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return NextResponse.json({
    books: books.map((book) => ({
      ...book,
      requiredHours: latestTest ? estimateReadingHours(book.wordCount, latestTest.wordsPerMin) : null
    })),
    wordsPerMinute: latestTest?.wordsPerMin ?? null
  });
}
