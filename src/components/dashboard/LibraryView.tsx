"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/dashboard/BookCover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlanInfo = {
  startDate: string | null;
  finishedAt: string | null;
};

type BookItem = {
  id: string;
  title: string;
  wordCount: number;
  estimatedPages: number;
  plan: PlanInfo | null;
};

type Props = {
  books: BookItem[];
  wordsPerMinute: number | null;
};

type Status = "pending" | "in_progress" | "completed";
type SortValue =
  | "words_desc"
  | "words_asc"
  | "time_desc"
  | "time_asc"
  | "start_desc"
  | "start_asc"
  | "finish_desc"
  | "finish_asc";

function getStatus(plan: PlanInfo | null): Status {
  if (!plan?.startDate) return "pending";
  if (plan.finishedAt) return "completed";
  return "in_progress";
}

function statusLabel(status: Status) {
  if (status === "pending") return "Pending";
  if (status === "completed") return "Completed";
  return "In Progress";
}

function statusChipClass(status: Status) {
  if (status === "pending") return "bg-slate-100 text-slate-700 border-slate-300";
  if (status === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  return "bg-amber-100 text-amber-800 border-amber-300";
}

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US");
}

function readingHours(words: number, wpm: number | null) {
  if (!wpm || wpm <= 0) return null;
  return words / wpm / 60;
}

function dateValue(date: string | null | undefined) {
  if (!date) return Number.NEGATIVE_INFINITY;
  return new Date(date).getTime();
}

export function LibraryView({ books, wordsPerMinute }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [sortBy, setSortBy] = useState<SortValue>("start_desc");

  const prepared = useMemo(() => {
    const filtered = books.filter((book) => {
      const status = getStatus(book.plan);
      const byStatus = statusFilter === "all" || status === statusFilter;
      const byQuery =
        !query.trim() || book.title.toLowerCase().includes(query.trim().toLowerCase());
      return byStatus && byQuery;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aHours = readingHours(a.wordCount, wordsPerMinute) ?? -1;
      const bHours = readingHours(b.wordCount, wordsPerMinute) ?? -1;
      const aStart = dateValue(a.plan?.startDate);
      const bStart = dateValue(b.plan?.startDate);
      const aFinish = dateValue(a.plan?.finishedAt);
      const bFinish = dateValue(b.plan?.finishedAt);

      switch (sortBy) {
        case "words_asc":
          return a.wordCount - b.wordCount;
        case "words_desc":
          return b.wordCount - a.wordCount;
        case "time_asc":
          return aHours - bHours;
        case "time_desc":
          return bHours - aHours;
        case "start_asc":
          return aStart - bStart;
        case "start_desc":
          return bStart - aStart;
        case "finish_asc":
          return aFinish - bFinish;
        case "finish_desc":
          return bFinish - aFinish;
        default:
          return 0;
      }
    });

    return sorted;
  }, [books, query, sortBy, statusFilter, wordsPerMinute]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Library</CardTitle>
            <CardDescription>Search, filter and sort your books.</CardDescription>
          </div>
          <div className="rounded-sm border border-border bg-accent/40 px-3 py-2 text-sm">
            {wordsPerMinute
              ? `Speed: ${wordsPerMinute.toFixed(0)} words/min`
              : "Speed: no data"}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title"
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | Status)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortValue)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
          >
            <option value="start_desc">Start date: newest first</option>
            <option value="start_asc">Start date: oldest first</option>
            <option value="finish_desc">Finish date: newest first</option>
            <option value="finish_asc">Finish date: oldest first</option>
            <option value="words_desc">Words: high to low</option>
            <option value="words_asc">Words: low to high</option>
            <option value="time_desc">Estimated time: long to short</option>
            <option value="time_asc">Estimated time: short to long</option>
          </select>
        </CardContent>
      </Card>

      {prepared.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            No books match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prepared.map((book) => {
            const status = getStatus(book.plan);
            const hours = readingHours(book.wordCount, wordsPerMinute);

            return (
              <Link key={book.id} href={`/dashboard/books/${book.id}`} className="block">
                <Card className="transition-transform duration-200 hover:scale-[1.01] hover:bg-accent/30">
                  <CardContent className="pt-5">
                    <div className="grid gap-4 md:grid-cols-[84px_1fr]">
                      <BookCover title={book.title} bookId={book.id} className="w-16 md:w-20" />

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{book.title}</h3>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusChipClass(status)}`}
                          >
                            {statusLabel(status)}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <p>
                            <span className="text-muted-foreground">Words: </span>
                            <strong>{book.wordCount.toLocaleString("en-US")}</strong>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Pages: </span>
                            <strong>{book.estimatedPages.toLocaleString("en-US")}</strong>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Est. time: </span>
                            <strong>{hours !== null ? `${hours.toFixed(1)} h` : "-"}</strong>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Start: </span>
                            <strong>{formatDate(book.plan?.startDate)}</strong>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Finish: </span>
                            <strong>{formatDate(book.plan?.finishedAt)}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
