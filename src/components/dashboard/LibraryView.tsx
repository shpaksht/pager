"use client";

import { Check, ChevronDown, MoreHorizontal, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookCover } from "@/components/dashboard/BookCover";
import { BookFixMatchModal } from "@/components/dashboard/BookFixMatchModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { buildMatchQueryFromBook, hasMatchedAuthor, splitTitleAndAuthor } from "@/lib/book-title";

type PlanInfo = {
  startDate: string | null;
  finishedAt: string | null;
};

type BookItem = {
  id: string;
  title: string;
  fileName: string;
  wordCount: number;
  estimatedPages: number;
  progressPercent: number;
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
  const router = useRouter();
  const [bookItems, setBookItems] = useState(books);
  const [query, setQuery] = useState("");
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([]);
  const [sortBy, setSortBy] = useState<SortValue>("start_desc");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchBookId, setMatchBookId] = useState<string | null>(null);
  const [matchQuery, setMatchQuery] = useState("");
  const suppressNextCardClick = useRef(false);
  const authorOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const book of bookItems) {
      const parts = splitTitleAndAuthor(book.title);
      if (parts.author) {
        unique.add(parts.author);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [bookItems]);
  const statusOptions = useMemo(
    () =>
      [
        { value: "pending" as Status, label: "Pending" },
        { value: "in_progress" as Status, label: "In Progress" },
        { value: "completed" as Status, label: "Completed" }
      ] as const,
    []
  );

  const prepared = useMemo(() => {
    const filtered = bookItems.filter((book) => {
      const status = getStatus(book.plan);
      const titleParts = splitTitleAndAuthor(book.title);
      const byStatus = selectedStatuses.length === 0 || selectedStatuses.includes(status);
      const byAuthors =
        selectedAuthors.length === 0 ||
        (titleParts.author ? selectedAuthors.includes(titleParts.author) : false);
      const normalizedQuery = query.trim().toLowerCase();
      const byQuery =
        !normalizedQuery ||
        titleParts.title.toLowerCase().includes(normalizedQuery) ||
        (titleParts.author?.toLowerCase().includes(normalizedQuery) ?? false);
      return byStatus && byAuthors && byQuery;
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
  }, [bookItems, query, selectedAuthors, selectedStatuses, sortBy, wordsPerMinute]);
  const preparedIds = useMemo(() => prepared.map((book) => book.id), [prepared]);
  const allPreparedSelected = useMemo(
    () => preparedIds.length > 0 && preparedIds.every((id) => selectedIds.includes(id)),
    [preparedIds, selectedIds]
  );

  async function deleteOne(bookId: string) {
    setBusy(true);
    setActionError(null);

    const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
    if (!response.ok) {
      setActionError("Could not delete the book");
      setBusy(false);
      return;
    }

    setBookItems((prev) => prev.filter((book) => book.id !== bookId));
    setSelectedIds((prev) => prev.filter((id) => id !== bookId));
    setBusy(false);
    router.refresh();
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;

    setBusy(true);
    setActionError(null);

    const response = await fetch("/api/books/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });

    if (!response.ok) {
      setActionError("Could not delete selected books");
      setBusy(false);
      return;
    }

    setBookItems((prev) => prev.filter((book) => !selectedIds.includes(book.id)));
    setSelectedIds([]);
    setSelectionMode(false);
    setBusy(false);
    router.refresh();
  }

  function toggleCardSelection(bookId: string) {
    setSelectedIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allPreparedSelected) {
        return prev.filter((id) => !preparedIds.includes(id));
      }
      const next = new Set(prev);
      for (const id of preparedIds) {
        next.add(id);
      }
      return Array.from(next);
    });
  }

  function toggleAuthor(author: string) {
    setSelectedAuthors((prev) =>
      prev.includes(author) ? prev.filter((item) => item !== author) : [...prev, author]
    );
  }

  function toggleStatus(status: Status) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status]
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-3">
          <div>
            <CardTitle>Library</CardTitle>
            <CardDescription>Search, filter and sort your books.</CardDescription>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="rounded-sm border border-border bg-accent/40 px-3 py-2 text-sm">
              {wordsPerMinute
                ? `Speed: ${wordsPerMinute.toFixed(0)} words/min`
                : "Speed: no data"}
            </div>
            <Button
              variant={selectionMode ? "default" : "outline"}
              onClick={() => {
                setSelectionMode((prev) => !prev);
                setSelectedIds([]);
                setActionError(null);
              }}
            >
              {selectionMode ? "Cancel" : "Select"}
            </Button>
            {selectionMode ? (
              <Button variant="outline" disabled={preparedIds.length === 0 || busy} onClick={toggleSelectAllVisible}>
                {allPreparedSelected ? "Unselect all" : "Select all"}
              </Button>
            ) : null}
            {selectionMode ? (
              <Button
                variant="outline"
                className="gap-2 text-red-700"
                disabled={selectedIds.length === 0 || busy}
                onClick={deleteSelected}
              >
                <Trash2 className="h-4 w-4" />
                Delete selected ({selectedIds.length})
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or author"
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 justify-between"
                disabled={authorOptions.length === 0}
              >
                {selectedAuthors.length > 0
                  ? `Authors: ${selectedAuthors.length}`
                  : "All authors"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 w-[280px] overflow-y-auto" align="start">
              <DropdownMenuItem
                disabled={selectedAuthors.length === 0}
                onSelect={(event) => {
                  event.preventDefault();
                  setSelectedAuthors([]);
                }}
              >
                Clear authors
              </DropdownMenuItem>
              {authorOptions.map((author) => {
                const selected = selectedAuthors.includes(author);
                return (
                  <DropdownMenuItem
                    key={author}
                    onSelect={(event) => {
                      event.preventDefault();
                      toggleAuthor(author);
                    }}
                  >
                    <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </span>
                    <span className="truncate">{author}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 justify-between">
                {selectedStatuses.length > 0
                  ? `Status: ${selectedStatuses.length}`
                  : "All statuses"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 w-[220px] overflow-y-auto" align="start">
              <DropdownMenuItem
                disabled={selectedStatuses.length === 0}
                onSelect={(event) => {
                  event.preventDefault();
                  setSelectedStatuses([]);
                }}
              >
                Clear statuses
              </DropdownMenuItem>
              {statusOptions.map((status) => {
                const selected = selectedStatuses.includes(status.value);
                return (
                  <DropdownMenuItem
                    key={status.value}
                    onSelect={(event) => {
                      event.preventDefault();
                      toggleStatus(status.value);
                    }}
                  >
                    <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </span>
                    <span>{status.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 justify-between">
                {sortBy === "start_desc" && "Start date: newest first"}
                {sortBy === "start_asc" && "Start date: oldest first"}
                {sortBy === "finish_desc" && "Finish date: newest first"}
                {sortBy === "finish_asc" && "Finish date: oldest first"}
                {sortBy === "words_desc" && "Words: high to low"}
                {sortBy === "words_asc" && "Words: low to high"}
                {sortBy === "time_desc" && "Estimated time: long to short"}
                {sortBy === "time_asc" && "Estimated time: short to long"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[280px]" align="start">
              {[
                { value: "start_desc", label: "Start date: newest first" },
                { value: "start_asc", label: "Start date: oldest first" },
                { value: "finish_desc", label: "Finish date: newest first" },
                { value: "finish_asc", label: "Finish date: oldest first" },
                { value: "words_desc", label: "Words: high to low" },
                { value: "words_asc", label: "Words: low to high" },
                { value: "time_desc", label: "Estimated time: long to short" },
                { value: "time_asc", label: "Estimated time: short to long" }
              ].map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={(event) => {
                    event.preventDefault();
                    setSortBy(option.value as SortValue);
                  }}
                >
                  <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                    {sortBy === option.value ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {actionError ? <p className="text-sm text-red-700">{actionError}</p> : null}

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
            const estimatedReadWords = Math.round((book.progressPercent / 100) * book.wordCount);
            const remainingWords = Math.max(0, book.wordCount - estimatedReadWords);
            const remainingHours = readingHours(remainingWords, wordsPerMinute);
            const titleParts = splitTitleAndAuthor(book.title);

            return (
              <Card
                key={book.id}
                className={[
                  "cursor-pointer transition-colors duration-200 hover:bg-accent/20 has-[button[data-card-actions-trigger]:hover]:bg-card",
                  selectionMode && selectedIds.includes(book.id)
                    ? "border-primary/70 bg-accent/35"
                    : ""
                ].join(" ")}
                onClick={(event) => {
                  if (suppressNextCardClick.current) {
                    suppressNextCardClick.current = false;
                    return;
                  }
                  const target = event.target as HTMLElement;
                  if (target.closest("[data-card-actions-root='true']")) {
                    return;
                  }
                  if (selectionMode) {
                    toggleCardSelection(book.id);
                    return;
                  }
                  router.push(`/dashboard/books/${book.id}`);
                }}
              >
                <CardContent className="pt-5">
                  <div className="grid gap-4 md:grid-cols-[84px_1fr]">
                    <BookCover
                      title={book.title}
                      bookId={book.id}
                      coverVersion={`${book.fileName}|${book.title}|${book.wordCount}`}
                      className="w-16 md:w-20"
                    />

                    <div className="space-y-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="line-clamp-2 break-words pr-2 text-lg font-semibold leading-tight" title={titleParts.title}>
                            {titleParts.title}
                          </h3>
                          {titleParts.author ? (
                            <p className="truncate text-sm text-muted-foreground" title={titleParts.author}>
                              {titleParts.author}
                            </p>
                          ) : null}
                          <div className="pt-0.5">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusChipClass(status)}`}
                            >
                              {statusLabel(status)}
                            </span>
                          </div>
                        </div>

                        <div className="ml-2 flex shrink-0 items-center gap-1" data-card-actions-root="true">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-card-actions-trigger="true"
                                onPointerDown={(event) => {
                                  suppressNextCardClick.current = true;
                                  event.stopPropagation();
                                }}
                                onMouseDown={(event) => {
                                  suppressNextCardClick.current = true;
                                  event.stopPropagation();
                                }}
                                onClick={(event) => {
                                  suppressNextCardClick.current = true;
                                  event.stopPropagation();
                                }}
                                aria-label="Book actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => {
                                  suppressNextCardClick.current = true;
                                  setMatchBookId(book.id);
                                  setMatchQuery(buildMatchQueryFromBook(book.title, book.fileName));
                                  setMatchModalOpen(true);
                                }}
                              >
                                {hasMatchedAuthor(book.title) ? "Fix match" : "Match"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-700"
                                onSelect={() => {
                                  suppressNextCardClick.current = true;
                                  void deleteOne(book.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete book
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {selectionMode ? (
                            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded border border-border bg-card text-[11px]">
                              {selectedIds.includes(book.id) ? "✓" : ""}
                            </span>
                          ) : null}
                        </div>
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
                        {status === "in_progress" ? (
                          <p>
                            <span className="text-muted-foreground">Read: </span>
                            <strong>{book.progressPercent}%</strong>
                          </p>
                        ) : null}
                        {status === "in_progress" ? (
                          <p>
                            <span className="text-muted-foreground">Remaining: </span>
                            <strong>{remainingHours !== null ? `${remainingHours.toFixed(1)} h` : "-"}</strong>
                          </p>
                        ) : null}
                      </div>

                      {status === "in_progress" ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <strong className="text-foreground">{book.progressPercent}%</strong>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded bg-accent/40">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${book.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BookFixMatchModal
        open={matchModalOpen}
        bookId={matchBookId}
        initialQuery={matchQuery}
        onClose={() => setMatchModalOpen(false)}
        onMatched={(updatedBook) => {
          if (updatedBook) {
            setBookItems((prev) =>
              prev.map((book) =>
                book.id === updatedBook.id
                  ? {
                      ...book,
                      title: updatedBook.title,
                      fileName: updatedBook.fileName,
                      wordCount: updatedBook.wordCount,
                      estimatedPages: updatedBook.estimatedPages
                    }
                  : book
              )
            );
          }
          router.refresh();
        }}
      />
    </div>
  );
}
