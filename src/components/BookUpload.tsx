"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

type UploadStatus = "queued" | "uploading" | "success" | "error";

type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  message?: string;
  bookId?: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function safeReadJson(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function BookUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const summary = useMemo(() => {
    const success = items.filter((i) => i.status === "success").length;
    const error = items.filter((i) => i.status === "error").length;
    const uploading = items.filter((i) => i.status === "uploading").length;
    const queued = items.filter((i) => i.status === "queued").length;
    return { success, error, uploading, queued, total: items.length };
  }, [items]);

  const completedCount = summary.success + summary.error;
  const progressPercent = summary.total > 0 ? Math.round((completedCount / summary.total) * 100) : 0;

  function isEpub(file: File) {
    return file.name.toLowerCase().endsWith(".epub");
  }

  async function uploadSingle(item: UploadItem) {
    if (!isEpub(item.file)) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: "error", message: "Only .epub files are supported" }
            : it
        )
      );
      return;
    }

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: "uploading", message: "Uploading..." } : it))
    );

    const formData = new FormData();
    formData.append("file", item.file);

    const response = await fetch("/api/books/upload", {
      method: "POST",
      body: formData
    });

    const data = await safeReadJson(response);

    if (!response.ok) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: "error",
                message: typeof data.error === "string" ? data.error : "Upload failed"
              }
            : it
        )
      );
      return;
    }

    const bookId = typeof data.book === "object" && data.book && "id" in data.book
      ? String((data.book as { id: string }).id)
      : null;

    if (!bookId) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: "error", message: "Upload finished but response is invalid" }
            : it
        )
      );
      return;
    }

    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, status: "success", message: "Uploaded", bookId }
          : it
      )
    );
  }

  async function processQueue(newItems: UploadItem[]) {
    if (isProcessing) return;

    setIsProcessing(true);

    for (const item of newItems) {
      await uploadSingle(item);
    }

    setIsProcessing(false);
  }

  async function enqueueFiles(files: FileList | File[]) {
    const array = Array.from(files);
    if (!array.length) return;

    const newItems: UploadItem[] = array.map((file) => ({
      id: makeId(),
      file,
      status: "queued"
    }));

    setItems((prev) => [...newItems, ...prev]);
    await processQueue(newItems);
  }

  async function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;
    await enqueueFiles(files);
    event.target.value = "";
  }

  async function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (!event.dataTransfer.files?.length) return;
    await enqueueFiles(event.dataTransfer.files);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!dragActive) setDragActive(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  const lastUploaded = items.find((i) => i.status === "success" && i.bookId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Drop one or many EPUB files. Upload starts automatically.
      </p>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          "cursor-pointer rounded-md border-2 border-dashed p-8 transition-all",
          dragActive ? "border-primary bg-accent/60" : "border-border bg-background"
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".epub,application/epub+zip"
          className="hidden"
          onChange={onInputChange}
        />

        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
          <div className="rounded-full border border-border bg-card p-3">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-base font-medium">Drop EPUB files here</p>
          <p className="text-sm text-muted-foreground">or click to choose files from your device</p>
          <p className="text-xs text-muted-foreground">Multiple files supported (.epub)</p>
        </div>
      </div>

      <div className="rounded-sm bg-accent/30 p-3 text-sm">
        <p>
          Total: <strong>{summary.total}</strong> · Uploaded: <strong>{summary.success}</strong> · Errors: <strong>{summary.error}</strong>
          {summary.uploading > 0 || summary.queued > 0
            ? ` · In progress: ${summary.uploading + summary.queued}`
            : ""}
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-background">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Progress: {progressPercent}%</p>
      </div>

      {items.length > 0 && (
        <div className="max-h-72 space-y-1 overflow-auto rounded-sm border border-border/70 p-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-sm border border-border/70 bg-card px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">{item.message ?? (item.status === "queued" ? "Queued" : "")}</p>
              </div>
              <div className="shrink-0">
                {item.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                ) : item.status === "error" ? (
                  <AlertCircle className="h-4 w-4 text-red-700" />
                ) : item.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lastUploaded?.bookId && (
        <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/books/${lastUploaded.bookId}`)}>
          Open last uploaded book
        </Button>
      )}
    </div>
  );
}
