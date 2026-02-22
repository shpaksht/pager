import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { LibraryView } from "@/components/dashboard/LibraryView";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [books, latestSpeedTest, chapterStats] = await Promise.all([
    prisma.book.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        fileName: true,
        wordCount: true,
        estimatedPages: true,
        plans: {
          select: {
            startDate: true,
            finishedAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.readingSpeedTest.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { wordsPerMin: true }
    }),
    prisma.$queryRaw<Array<{ bookId: string; isRead: boolean; words: bigint | number | null }>>(
      Prisma.sql`
        SELECT
          bc."bookId" AS "bookId",
          bc."isRead" AS "isRead",
          SUM(GREATEST(bc."wordCount", 1)) AS "words"
        FROM "BookChapter" bc
        JOIN "Book" b ON b."id" = bc."bookId"
        WHERE b."userId" = ${user.id}
        GROUP BY bc."bookId", bc."isRead"
      `
    )
  ]);

  const chapterProgressByBook = new Map<string, { total: number; read: number }>();
  for (const row of chapterStats) {
    const current = chapterProgressByBook.get(row.bookId) ?? { total: 0, read: 0 };
    const words =
      typeof row.words === "bigint"
        ? Number(row.words)
        : typeof row.words === "number"
          ? row.words
          : 0;
    current.total += words;
    if (row.isRead) {
      current.read += words;
    }
    chapterProgressByBook.set(row.bookId, current);
  }

  const normalizedBooks = books.map((book) => {
    const plan = book.plans[0];
    const chapterStats = chapterProgressByBook.get(book.id);
    const chapterProgress =
      chapterStats && chapterStats.total > 0
        ? Math.round((chapterStats.read / chapterStats.total) * 100)
        : 0;
    const progressPercent = plan?.finishedAt ? 100 : chapterProgress;

    return {
      id: book.id,
      title: book.title,
      fileName: book.fileName,
      wordCount: book.wordCount,
      estimatedPages: book.estimatedPages,
      progressPercent,
      plan: plan
        ? {
            startDate: plan.startDate.toISOString(),
            finishedAt: plan.finishedAt?.toISOString() ?? null
          }
        : null
    };
  });

  return <LibraryView books={normalizedBooks} wordsPerMinute={latestSpeedTest?.wordsPerMin ?? null} />;
}
