import { notFound } from "next/navigation";
import { BookCover } from "@/components/dashboard/BookCover";
import { BookChaptersProgress } from "@/components/dashboard/BookChaptersProgress";
import { DeleteBookButton } from "@/components/dashboard/DeleteBookButton";
import { BookHeaderActions } from "@/components/dashboard/BookHeaderActions";
import { BookReadingControlsInline } from "@/components/dashboard/BookReadingControlsInline";
import { BookTopMetricsLive } from "@/components/dashboard/BookTopMetricsLive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { hasMatchedAuthor, splitTitleAndAuthor } from "@/lib/book-title";
import { prisma } from "@/lib/prisma";
import { estimateReadingHours } from "@/lib/reading";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const [book, latestTest] = await Promise.all([
    prisma.book.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        title: true,
        fileName: true,
        wordCount: true,
        estimatedPages: true,
        createdAt: true,
        plans: true,
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            title: true,
            wordCount: true,
            isRead: true
          }
        }
      }
    }),
    prisma.readingSpeedTest.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    })
  ]);

  if (!book) {
    notFound();
  }

  const requiredHours = latestTest ? estimateReadingHours(book.wordCount, latestTest.wordsPerMin) : null;
  const plan = book.plans[0];
  const status = !plan?.startDate ? "Pending" : plan.finishedAt ? "Completed" : "In Progress";
  const isMatched = hasMatchedAuthor(book.title);
  const titleParts = splitTitleAndAuthor(book.title);
  const weightedTotal = book.chapters.reduce((sum, chapter) => sum + Math.max(1, chapter.wordCount), 0);
  const weightedRead = book.chapters
    .filter((chapter) => chapter.isRead)
    .reduce((sum, chapter) => sum + Math.max(1, chapter.wordCount), 0);
  const readPercent = weightedTotal > 0 ? Math.min(100, Math.round((weightedRead / weightedTotal) * 100)) : 0;

  const statusChipClass =
    status === "Pending"
      ? "bg-slate-100 text-slate-700 border-slate-300"
      : status === "Completed"
        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
        : "bg-amber-100 text-amber-800 border-amber-300";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-[148px_minmax(0,1fr)]">
            <BookCover
              title={book.title}
              bookId={book.id}
              coverVersion={`${book.fileName}|${book.title}|${book.wordCount}`}
              className="h-44 w-32 md:h-52 md:w-36"
            />
            <div className="min-w-0 space-y-4">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-start gap-2">
                  <CardTitle className="break-words">{titleParts.title}</CardTitle>
                  <div className={`mt-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusChipClass}`}>
                    {status}
                  </div>
                  <div className="ml-auto">
                    <BookHeaderActions
                      bookId={book.id}
                      bookTitle={book.title}
                      bookFileName={book.fileName}
                      isMatched={isMatched}
                    />
                  </div>
                </div>
                {titleParts.author ? (
                  <CardDescription className="text-sm leading-tight" title={titleParts.author}>
                    {titleParts.author}
                  </CardDescription>
                ) : null}
              </div>

              <BookTopMetricsLive
                bookId={book.id}
                status={status}
                wordCount={book.wordCount}
                estimatedPages={book.estimatedPages}
                requiredHours={requiredHours}
                wordsPerMinute={latestTest?.wordsPerMin ?? null}
                initialReadPercent={readPercent}
              />

            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border-t border-border pt-4">
            <BookReadingControlsInline
              bookId={book.id}
              hasStarted={Boolean(plan?.startDate)}
              estimatedEndDate={plan?.estimatedEndDate?.toISOString() ?? null}
              finishedAt={plan?.finishedAt?.toISOString() ?? null}
            />
          </div>
        </CardContent>
      </Card>

      {plan?.startDate ? (
        <BookChaptersProgress
          bookId={book.id}
          chapters={book.chapters}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Track Your Reading</CardTitle>
            <CardDescription>Press Start above to unlock chapter tracking.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Delete this book and all associated reading data.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteBookButton bookId={book.id} bookTitle={book.title} />
        </CardContent>
      </Card>
    </div>
  );
}
