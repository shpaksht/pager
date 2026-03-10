"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/dashboard/BookCover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReadingListSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  previewBooks: Array<{
    id: string;
    title: string;
    fileName: string;
    wordCount: number;
  }>;
  booksCount: number;
  totalHours: number;
  remainingHours: number;
  progressPercent: number;
};

type Props = {
  initialLists: ReadingListSummary[];
};

function formatHours(value: number) {
  return `${value.toFixed(1)} h`;
}

export function ReadingListsOverview({ initialLists }: Props) {
  const [lists, setLists] = useState(initialLists);
  const [newListName, setNewListName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createList() {
    const name = newListName.trim();
    if (!name) return;

    setBusy(true);
    setError(null);
    const response = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      list?: { id: string; name: string; createdAt: string; updatedAt: string };
    };

    if (!response.ok || !data.list) {
      setError(data.error ?? "Could not create list");
      setBusy(false);
      return;
    }

    setLists((prev) => [
      {
        ...data.list!,
        previewBooks: [],
        booksCount: 0,
        totalHours: 0,
        remainingHours: 0,
        progressPercent: 0
      },
      ...prev
    ]);
    setNewListName("");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-3">
          <div>
            <CardTitle>Lists</CardTitle>
            <CardDescription>Build reading queues for any theme, season, or sprint.</CardDescription>
          </div>
          <div className="ml-auto flex w-full max-w-xl flex-wrap gap-2">
            <input
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="Spring reading queue"
              className="h-10 min-w-[240px] flex-1 rounded-md border border-border bg-card px-3 text-sm"
            />
            <Button type="button" onClick={() => void createList()} disabled={busy}>
              {busy ? "Creating..." : "Create list"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {lists.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            No lists yet. Create one and start organizing your reading queue.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <Link key={list.id} href={`/dashboard/lists/${list.id}`} className="block">
              <Card className="transition-colors hover:bg-accent/20">
                <CardContent className="pt-5">
                  <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="flex min-h-[168px] items-center justify-center rounded-md border border-border/70 bg-accent/10 p-4">
                      {list.previewBooks.length > 0 ? (
                        <div className="relative h-36 w-32">
                          {list.previewBooks.map((book, index) => (
                            <div
                              key={book.id}
                              className="absolute top-1/2"
                              style={{
                                left: `${index * 22}px`,
                                zIndex: list.previewBooks.length - index,
                                transform: `translateY(-50%) rotate(${index === 0 ? -8 : index === 1 ? 0 : 8}deg)`
                              }}
                            >
                              <BookCover
                                title={book.title}
                                bookId={book.id}
                                coverVersion={`${book.fileName}|${book.title}|${book.wordCount}`}
                                className="h-32 w-20 min-w-0 shadow-lg"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border bg-card/70 px-4 text-center text-sm text-muted-foreground">
                          No books yet
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-xl">{list.name}</CardTitle>
                          <CardDescription>
                            Updated {new Date(list.updatedAt).toLocaleDateString("en-US")}
                          </CardDescription>
                        </div>
                        <div className="shrink-0 rounded-full border border-border bg-accent/20 px-3 py-1 text-sm">
                          {list.booksCount} book{list.booksCount === 1 ? "" : "s"}
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Total time</p>
                          <p className="mt-1 text-2xl font-semibold">{formatHours(list.totalHours)}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className="mt-1 text-2xl font-semibold">{formatHours(list.remainingHours)}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <p className="mt-1 text-2xl font-semibold">{list.progressPercent}%</p>
                        </div>
                        <div className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="mt-1 text-base font-semibold">
                            {new Date(list.createdAt).toLocaleDateString("en-US")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
