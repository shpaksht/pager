import { notFound } from "next/navigation";
import { BookCover } from "@/components/dashboard/BookCover";
import { DeleteBookButton } from "@/components/dashboard/DeleteBookButton";
import { BookProgressPanel } from "@/components/dashboard/BookProgressPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysBetweenInclusive, estimatePagesPerMinute, estimateReadingHours } from "@/lib/reading";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const [book, latestTest] = await Promise.all([
    prisma.book.findFirst({
      where: { id, userId: user.id },
      include: { plans: true }
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

  const completionStats =
    plan?.finishedAt && latestTest
      ? {
          actualDays: daysBetweenInclusive(plan.startDate, plan.finishedAt),
          pagesPerDay:
            daysBetweenInclusive(plan.startDate, plan.finishedAt) > 0
              ? book.estimatedPages / daysBetweenInclusive(plan.startDate, plan.finishedAt)
              : 0,
          pagesPerMinute: estimatePagesPerMinute(latestTest.wordsPerMin)
        }
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>{book.title}</CardTitle>
              <CardDescription>{book.fileName}</CardDescription>
            </div>
            <div className="rounded-sm border border-border bg-accent/40 px-3 py-1 text-sm">{status}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[120px_1fr]">
            <BookCover title={book.title} bookId={book.id} className="h-32 w-24 md:h-36 md:w-28" />
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="flex h-28 flex-col justify-between rounded-sm border border-border bg-accent/30 p-3">
                <p className="text-sm text-muted-foreground">Words</p>
                <p className="self-end text-4xl font-semibold leading-none">{book.wordCount.toLocaleString("en-US")}</p>
              </div>
              <div className="flex h-28 flex-col justify-between rounded-sm border border-border bg-accent/30 p-3">
                <p className="text-sm text-muted-foreground">Pages</p>
                <p className="self-end text-4xl font-semibold leading-none">{book.estimatedPages.toLocaleString("en-US")}</p>
              </div>
              <div className="flex h-28 flex-col justify-between rounded-sm border border-border bg-accent/30 p-3">
                <p className="text-sm text-muted-foreground">Reading Time Estimate</p>
                <p className="self-end text-4xl font-semibold leading-none">{requiredHours !== null ? `${requiredHours.toFixed(1)} h` : "-"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <BookProgressPanel
        bookId={book.id}
        startDate={formatDateInput(plan?.startDate ?? new Date())}
        estimatedEndDate={plan?.estimatedEndDate?.toISOString() ?? null}
        finishedAt={plan?.finishedAt?.toISOString() ?? null}
        initialStats={completionStats}
      />

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
