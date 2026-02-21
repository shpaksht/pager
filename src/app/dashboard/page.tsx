import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { LibraryView } from "@/components/dashboard/LibraryView";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [books, latestSpeedTest] = await Promise.all([
    prisma.book.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
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
    })
  ]);

  const normalizedBooks = books.map((book) => ({
    id: book.id,
    title: book.title,
    wordCount: book.wordCount,
    estimatedPages: book.estimatedPages,
    plan: book.plans[0]
      ? {
          startDate: book.plans[0].startDate.toISOString(),
          finishedAt: book.plans[0].finishedAt?.toISOString() ?? null
        }
      : null
  }));

  return <LibraryView books={normalizedBooks} wordsPerMinute={latestSpeedTest?.wordsPerMin ?? null} />;
}
