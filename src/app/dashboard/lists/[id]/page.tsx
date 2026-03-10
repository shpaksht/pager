import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { ReadingListDetailView } from "@/components/dashboard/ReadingListDetailView";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateReadingHours } from "@/lib/reading";

type BookWithPlan = {
  id: string;
  title: string;
  fileName: string;
  wordCount: number;
  estimatedPages: number;
  plans: Array<{
    startDate: Date;
    finishedAt: Date | null;
  }>;
};

function getStatus(book: BookWithPlan) {
  const plan = book.plans[0];
  if (!plan?.startDate) return "pending" as const;
  if (plan.finishedAt) return "completed" as const;
  return "in_progress" as const;
}

export default async function ReadingListPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const [books, list, latestSpeedTest, chapterStats] = await Promise.all([
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
    prisma.readingList.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        items: {
          orderBy: { position: "asc" },
          select: {
            position: true,
            book: {
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
              }
            }
          }
        }
      }
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

  if (!list) {
    notFound();
  }

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

  function normalizeBook(book: BookWithPlan) {
    const chapterStats = chapterProgressByBook.get(book.id);
    const chapterProgress =
      chapterStats && chapterStats.total > 0
        ? Math.round((chapterStats.read / chapterStats.total) * 100)
        : 0;
    const plan = book.plans[0];
    const progressPercent = plan?.finishedAt ? 100 : chapterProgress;
    const requiredHours =
      latestSpeedTest?.wordsPerMin && latestSpeedTest.wordsPerMin > 0
        ? estimateReadingHours(book.wordCount, latestSpeedTest.wordsPerMin)
        : null;
    const remainingWords = Math.max(0, book.wordCount - Math.round((progressPercent / 100) * book.wordCount));
    const remainingHours =
      latestSpeedTest?.wordsPerMin && latestSpeedTest.wordsPerMin > 0
        ? estimateReadingHours(remainingWords, latestSpeedTest.wordsPerMin)
        : null;

    return {
      id: book.id,
      title: book.title,
      fileName: book.fileName,
      wordCount: book.wordCount,
      estimatedPages: book.estimatedPages,
      progressPercent,
      status: getStatus(book),
      requiredHours,
      remainingHours
    };
  }

  const libraryBooks = books.map(normalizeBook);
  const normalizedList = {
    id: list.id,
    name: list.name,
    updatedAt: list.updatedAt.toISOString(),
    items: list.items.map((item) => ({
      ...normalizeBook(item.book),
      position: item.position
    }))
  };

  return <ReadingListDetailView initialList={normalizedList} libraryBooks={libraryBooks} />;
}
