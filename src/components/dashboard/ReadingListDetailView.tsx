"use client";

import Link from "next/link";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { splitTitleAndAuthor } from "@/lib/book-title";
import { BookCover } from "@/components/dashboard/BookCover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModalOverlay } from "@/components/ui/modal-overlay";

type Status = "pending" | "in_progress" | "completed";

type LibraryBook = {
  id: string;
  title: string;
  fileName: string;
  wordCount: number;
  estimatedPages: number;
  progressPercent: number;
  status: Status;
  requiredHours: number | null;
  remainingHours: number | null;
};

type ReadingListItem = LibraryBook & {
  position: number;
};

type ReadingList = {
  id: string;
  name: string;
  updatedAt: string;
  items: ReadingListItem[];
};

type Props = {
  initialList: ReadingList;
  libraryBooks: LibraryBook[];
};

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

function formatHours(value: number | null) {
  if (value === null) return "-";
  return `${value.toFixed(1)} h`;
}

function queueStatusRank(status: Status) {
  if (status === "in_progress") return 0;
  if (status === "pending") return 1;
  return 2;
}

function sortBooksByQueueStatus<T extends { status: Status; position?: number; title: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const statusDiff = queueStatusRank(a.status) - queueStatusRank(b.status);
    if (statusDiff !== 0) return statusDiff;

    const aPosition = a.position ?? Number.MAX_SAFE_INTEGER;
    const bPosition = b.position ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;

    return a.title.localeCompare(b.title);
  });
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function withPositions(items: ReadingListItem[]) {
  return items.map((item, index) => ({ ...item, position: index + 1 }));
}

export function ReadingListDetailView({ initialList, libraryBooks }: Props) {
  const [list, setList] = useState(initialList);
  const [draftName, setDraftName] = useState(initialList.name);
  const [draggedBookId, setDraggedBookId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBooks = useMemo(() => {
    const selectedIds = new Set(list.items.map((item) => item.id));
    return sortBooksByQueueStatus(libraryBooks.filter((book) => !selectedIds.has(book.id)));
  }, [libraryBooks, list.items]);

  const orderedItems = useMemo(
    () => [...list.items].sort((a, b) => a.position - b.position),
    [list.items]
  );

  const stats = useMemo(() => {
    const totalWords = orderedItems.reduce((sum, item) => sum + item.wordCount, 0);
    const readWords = orderedItems.reduce(
      (sum, item) => sum + Math.round((item.progressPercent / 100) * item.wordCount),
      0
    );
    const totalHours = orderedItems.reduce((sum, item) => sum + (item.requiredHours ?? 0), 0);
    const remainingHours = orderedItems.reduce((sum, item) => sum + (item.remainingHours ?? 0), 0);

    return {
      totalBooks: orderedItems.length,
      totalHours,
      remainingHours,
      readHours: Math.max(0, totalHours - remainingHours),
      progressPercent: totalWords > 0 ? Math.round((readWords / totalWords) * 100) : 0
    };
  }, [orderedItems]);

  async function saveListName() {
    const name = draftName.trim();
    if (!name || name === list.name) return;

    setBusy(true);
    setError(null);
    const response = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; list?: { name: string; updatedAt: string } };

    if (!response.ok || !data.list) {
      setError(data.error ?? "Could not rename list");
      setBusy(false);
      return;
    }

    setList((prev) => ({ ...prev, name: data.list!.name, updatedAt: data.list!.updatedAt }));
    setBusy(false);
  }

  async function deleteList() {
    const confirmed = window.confirm(`Delete list "${list.name}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete list");
      return;
    }

    window.location.href = "/dashboard/lists";
  }

  async function addSelectedBooks() {
    if (selectedBookIds.length === 0) return;

    setBusy(true);
    setError(null);

    const addedBooks: LibraryBook[] = [];
    for (const bookId of selectedBookIds) {
      const response = await fetch(`/api/lists/${list.id}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not add one of the books");
        setBusy(false);
        return;
      }

      const book = libraryBooks.find((item) => item.id === bookId);
      if (book) addedBooks.push(book);
    }

    setList((prev) => ({
      ...prev,
      items: withPositions([
        ...prev.items,
        ...addedBooks.map((book, index) => ({ ...book, position: prev.items.length + index + 1 }))
      ])
    }));
    setSelectedBookIds([]);
    setAddModalOpen(false);
    setBusy(false);
  }

  async function removeBook(bookId: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/lists/${list.id}/books/${bookId}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not remove book");
      setBusy(false);
      return;
    }

    setList((prev) => ({
      ...prev,
      items: withPositions(prev.items.filter((item) => item.id !== bookId))
    }));
    setBusy(false);
  }

  async function persistReorder(nextItems: ReadingListItem[]) {
    const response = await fetch(`/api/lists/${list.id}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedBookIds: nextItems.map((item) => item.id) })
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Could not reorder books");
    }
  }

  async function reorderBook(fromBookId: string, toBookId: string) {
    const fromIndex = orderedItems.findIndex((item) => item.id === fromBookId);
    const toIndex = orderedItems.findIndex((item) => item.id === toBookId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const previousItems = orderedItems;
    const nextItems = withPositions(moveItem(previousItems, fromIndex, toIndex));
    setList((prev) => ({ ...prev, items: nextItems }));

    try {
      await persistReorder(nextItems);
    } catch (reorderError) {
      setList((prev) => ({ ...prev, items: previousItems }));
      setError(reorderError instanceof Error ? reorderError.message : "Could not reorder books");
    }
  }

  async function nudgeBook(bookId: string, direction: -1 | 1) {
    const currentIndex = orderedItems.findIndex((item) => item.id === bookId);
    const nextIndex = currentIndex + direction;
    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= orderedItems.length) return;
    await reorderBook(bookId, orderedItems[nextIndex].id);
  }

  return (
    <div className="space-y-4">
      <Button asChild type="button" variant="outline">
        <Link href="/dashboard/lists">Back to lists</Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <CardTitle>{list.name}</CardTitle>
              <CardDescription>Queue view for this reading list.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="h-10 min-w-[240px] flex-1 rounded-md border border-border bg-card px-3 text-sm"
              />
              <Button type="button" variant="outline" onClick={() => void saveListName()} disabled={busy}>
                Save name
              </Button>
              <Button type="button" onClick={() => setAddModalOpen(true)} disabled={availableBooks.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Add books
              </Button>
              <Button type="button" variant="outline" className="text-red-700" onClick={() => void deleteList()}>
                Delete list
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-border bg-accent/20 p-4">
            <p className="text-sm text-muted-foreground">Books</p>
            <p className="mt-1 text-3xl font-semibold">{stats.totalBooks}</p>
          </div>
          <div className="rounded-md border border-border bg-accent/20 p-4">
            <p className="text-sm text-muted-foreground">Total time</p>
            <p className="mt-1 text-3xl font-semibold">{formatHours(stats.totalHours)}</p>
          </div>
          <div className="rounded-md border border-border bg-accent/20 p-4">
            <p className="text-sm text-muted-foreground">Read already</p>
            <p className="mt-1 text-3xl font-semibold">{formatHours(stats.readHours)}</p>
          </div>
          <div className="rounded-md border border-border bg-accent/20 p-4">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="mt-1 text-3xl font-semibold">{stats.progressPercent}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Remaining: {formatHours(stats.remainingHours)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Priority order</CardTitle>
          <CardDescription>Open books in the order you want to read them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orderedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books in this list yet.</p>
          ) : (
            orderedItems.map((item, index) => {
              const parts = splitTitleAndAuthor(item.title);

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedBookId(item.id)}
                  onDragEnd={() => setDraggedBookId(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (!draggedBookId) return;
                    void reorderBook(draggedBookId, item.id);
                    setDraggedBookId(null);
                  }}
                  className={[
                    "grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-[auto_72px_minmax(0,1fr)_auto]",
                    draggedBookId === item.id ? "opacity-70" : ""
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="w-6 text-sm font-medium">{index + 1}</span>
                  </div>

                  <BookCover
                    title={item.title}
                    bookId={item.id}
                    coverVersion={`${item.fileName}|${item.title}|${item.wordCount}`}
                    className="w-14"
                  />

                  <div className="min-w-0 space-y-2">
                    <Link href={`/dashboard/books/${item.id}`} className="block">
                      <p className="line-clamp-2 text-sm font-semibold hover:underline">{parts.title}</p>
                    </Link>
                    {parts.author ? <p className="text-sm text-muted-foreground">{parts.author}</p> : null}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 ${statusChipClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                        {item.progressPercent}% read
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                        {formatHours(item.requiredHours)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void nudgeBook(item.id, -1)} disabled={index === 0 || busy}>
                        Up
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void nudgeBook(item.id, 1)} disabled={index === orderedItems.length - 1 || busy}>
                        Down
                      </Button>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-2 text-red-700" onClick={() => void removeBook(item.id)} disabled={busy}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {addModalOpen ? (
        <ModalOverlay open={addModalOpen} onClose={() => setAddModalOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-md border border-border bg-card p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <div>
                <p className="text-base font-semibold">Add books to list</p>
                <p className="text-sm text-muted-foreground">Choose one or several books from your library.</p>
              </div>

              <div className="max-h-[70vh] space-y-2 overflow-auto rounded-md border border-border p-2">
                {availableBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All library books are already in this list.</p>
                ) : (
                  availableBooks.map((book) => {
                    const parts = splitTitleAndAuthor(book.title);
                    const selected = selectedBookIds.includes(book.id);

                    return (
                      <label
                        key={book.id}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition-colors",
                          selected
                            ? "border-primary bg-accent/30"
                            : "border-border/70 hover:border-primary/50 hover:bg-accent/20"
                        ].join(" ")}
                      >
                        <BookCover
                          title={book.title}
                          bookId={book.id}
                          coverVersion={`${book.fileName}|${book.title}|${book.wordCount}`}
                          className="w-12 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{parts.title}</p>
                          {parts.author ? <p className="text-sm text-muted-foreground">{parts.author}</p> : null}
                        </div>
                        <input
                          type="checkbox"
                          checked={selected}
                          className="mt-1 h-4 w-4 shrink-0"
                          onChange={(event) =>
                            setSelectedBookIds((prev) =>
                              event.target.checked ? [...prev, book.id] : prev.filter((id) => id !== book.id)
                            )
                          }
                        />
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={selectedBookIds.length === 0 || busy} onClick={() => void addSelectedBooks()}>
                  {busy ? "Adding..." : `Add selected (${selectedBookIds.length})`}
                </Button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  );
}
