"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  bookId: string;
};

async function safeJson(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function BookFileUploadCard({ bookId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setInfo(null);

    if (!file.name.toLowerCase().endsWith(".epub")) {
      setError("Only .epub files are supported");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/books/${bookId}/upload`, {
      method: "POST",
      body: formData
    });

    const data = await safeJson(response);

    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Upload failed");
      setLoading(false);
      return;
    }

    const matchedCatalog =
      typeof data.matchedCatalog === "object" && data.matchedCatalog && "title" in data.matchedCatalog
        ? String((data.matchedCatalog as { title: string }).title)
        : null;

    setInfo(
      matchedCatalog
        ? `EPUB uploaded. Matched with catalog: ${matchedCatalog}.`
        : "EPUB uploaded. Parsing complete."
    );
    setLoading(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Track your reading</CardTitle>
        <CardDescription>
          Upload the EPUB file for this book. We will parse chapters and enable detailed progress tracking.
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
            "cursor-pointer rounded-md border-2 border-dashed p-6 transition-all",
            dragActive ? "border-primary bg-accent/60" : "border-border bg-background",
            loading ? "opacity-80" : ""
          ].join(" ")}
          onClick={() => !loading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !loading) {
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
            disabled={loading}
          />

          <div className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
            <p className="text-sm font-medium">
              {loading ? "Uploading and parsing..." : "Drop EPUB here or click to choose"}
            </p>
            <p className="text-xs text-muted-foreground">
              Existing metadata for this book will be replaced by parsed EPUB data.
            </p>
          </div>
        </div>

        {info ? <p className="text-sm text-green-700">{info}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
