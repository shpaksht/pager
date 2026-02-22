"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ChapterItem = {
  id: string;
  title: string;
  order: number;
  wordCount: number;
  isRead: boolean;
};

type Props = {
  bookId: string;
  chapters: ChapterItem[];
};

export function BookChaptersProgress({ bookId, chapters }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState(chapters);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function emitProgress(nextItems: ChapterItem[]) {
    const weightedTotal = nextItems.reduce((sum, chapter) => sum + Math.max(1, chapter.wordCount), 0);
    const weightedRead = nextItems
      .filter((chapter) => chapter.isRead)
      .reduce((sum, chapter) => sum + Math.max(1, chapter.wordCount), 0);
    const percent = weightedTotal > 0 ? Math.round((weightedRead / weightedTotal) * 100) : 0;

    window.dispatchEvent(
      new CustomEvent("book-progress-updated", {
        detail: {
          bookId,
          percent
        }
      })
    );
  }

  async function upload(file: File) {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".epub")) {
      setError("Only .epub files are supported");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/books/${bookId}/upload`, {
      method: "POST",
      body: formData
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Upload failed");
      setUploading(false);
      return;
    }

    setUploading(false);
    router.refresh();
  }

  async function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await upload(file);
    event.target.value = "";
  }

  async function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await upload(file);
  }

  async function toggleChapter(chapterId: string, nextIsRead: boolean) {
    setError(null);
    setUpdatingId(chapterId);

    const optimisticItems = items.map((chapter) =>
      chapter.id === chapterId ? { ...chapter, isRead: nextIsRead } : chapter
    );
    setItems(optimisticItems);
    emitProgress(optimisticItems);

    const response = await fetch(`/api/books/${bookId}/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: nextIsRead })
    });

    if (!response.ok) {
      const revertedItems = optimisticItems.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, isRead: !nextIsRead } : chapter
      );
      setItems(revertedItems);
      emitProgress(revertedItems);

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not update chapter status");
    }

    setUpdatingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Track Your Reading</CardTitle>
        <CardDescription>
          Upload EPUB and track chapters in one place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          onDrop={onDrop}
          onDragOver={(event) => {
            event.preventDefault();
            if (!dragActive) setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          className={[
            "cursor-pointer rounded-md border border-dashed p-3 transition-all",
            dragActive ? "border-primary bg-accent/60" : "border-border bg-accent/20",
            uploading ? "opacity-80" : ""
          ].join(" ")}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !uploading) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".epub,application/epub+zip"
            className="hidden"
            onChange={onInputChange}
            disabled={uploading}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Track Your Reading</p>
              <p className="text-xs text-muted-foreground">
                {items.length > 0
                  ? "Upload a new EPUB to update chapters and stats."
                  : "Upload EPUB for this book to generate the chapter list."}
              </p>
            </div>
            <Button type="button" variant="outline" className="gap-2" disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {items.length > 0 ? "Replace EPUB" : "Upload EPUB"}
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chapters yet. Upload EPUB to start tracking.</p>
        ) : (
          <div className="max-h-[460px] space-y-2 overflow-auto rounded-sm border border-border/70 p-2">
            {items
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((chapter) => (
                <label
                  key={chapter.id}
                  className="flex items-center justify-between gap-3 rounded-sm border border-border/70 bg-card px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={chapter.isRead}
                      disabled={updatingId === chapter.id}
                      onChange={(event) => toggleChapter(chapter.id, event.target.checked)}
                    />
                    <span className={chapter.isRead ? "text-muted-foreground line-through" : ""}>
                      {chapter.title}
                    </span>
                  </span>

                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {chapter.wordCount > 0 ? `${chapter.wordCount.toLocaleString("en-US")} words` : "No word data"}
                    {updatingId === chapter.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  </span>
                </label>
              ))}
          </div>
        )}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
