"use client";

import { useCallback, useEffect, useState } from "react";
import { BookPlus, Loader2, Search, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookUpload } from "@/components/BookUpload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CatalogItem = {
  key: string;
  title: string;
  authors: string[];
  publishedYear: number | null;
  pageCount: number | null;
  wordCountEstimate: number | null;
  coverUrl: string | null;
  language: string | null;
  sources: Array<"google" | "openlibrary">;
  externalIds: {
    google?: string;
    openlibrary?: string;
  };
  isbn: string | null;
};

type Props = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
  triggerVariant?: "default" | "outline" | "ghost";
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

export function CatalogSearchModal({
  triggerClassName,
  onTriggerClick,
  triggerVariant = "outline"
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "upload">("catalog");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [uploadInProgress, setUploadInProgress] = useState(false);

  const hasQuery = query.trim().length >= 2;

  function handleClose() {
    if (uploadInProgress) {
      const shouldClose = window.confirm("Upload is in progress. Closing now will stop the current upload. Continue?");
      if (!shouldClose) return;
    }
    setOpen(false);
  }

  const runSearch = useCallback(
    async (rawQuery?: string) => {
      const term = (rawQuery ?? query).trim();

      if (term.length < 2) {
        setItems([]);
        setHasSearched(false);
        return;
      }
      setSearching(true);
      setError(null);

      const response = await fetch(`/api/catalog/search?query=${encodeURIComponent(term)}`);
      const data = await safeJson(response);

      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not search catalog");
        setSearching(false);
        setHasSearched(true);
        return;
      }

      const nextItems = Array.isArray(data.items) ? (data.items as CatalogItem[]) : [];
      setItems(nextItems);
      setSearching(false);
      setHasSearched(true);
    },
    [query]
  );

  useEffect(() => {
    if (!open || activeTab !== "catalog") return;
    if (!hasQuery) {
      setItems([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(query);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, open, hasQuery, runSearch, activeTab]);

  async function addBook(item: CatalogItem) {
    setAddingKey(item.key);
    setError(null);

    const response = await fetch("/api/catalog/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    const data = await safeJson(response);

    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not add book");
      setAddingKey(null);
      return;
    }

    setAddingKey(null);
    handleClose();
    router.refresh();
  }

  return (
    <>
      <Button
        variant={triggerVariant}
        className={cn("gap-2", triggerClassName)}
        onClick={() => {
          onTriggerClick?.();
          setOpen(true);
        }}
      >
        <BookPlus className="h-4 w-4" />
        Add Book
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[9999] bg-black/40 p-3 sm:p-6" onClick={handleClose}>
          <div
            className="mx-auto mt-6 w-full max-w-4xl rounded-md border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-lg font-semibold">Add Book</h3>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Close
              </Button>
            </div>

            <div className="border-b border-border px-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activeTab === "catalog" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setActiveTab("catalog")}
                >
                  <Search className="h-4 w-4" />
                  From Catalog
                </Button>
                <Button
                  variant={activeTab === "upload" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setActiveTab("upload")}
                >
                  <Upload className="h-4 w-4" />
                  Upload EPUB
                </Button>
              </div>
            </div>

            <div className="p-4">
              {activeTab === "catalog" ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by title, author, or ISBN"
                      className="h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm"
                    />
                    <Button disabled={!hasQuery || searching} onClick={() => void runSearch(query)} className="gap-2">
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Search
                    </Button>
                  </div>

                  {error ? <p className="text-sm text-red-700">{error}</p> : null}

                  <div className="max-h-[60vh] space-y-2 overflow-auto">
                    {items.map((item) => (
                      <div key={item.key} className="rounded-sm border border-border bg-accent/25 p-3">
                        <div className="grid grid-cols-[56px_1fr_auto] items-start gap-3">
                          <div className="relative h-[78px] w-[56px] overflow-hidden rounded-sm border border-border bg-card">
                            {item.coverUrl ? (
                              <Image
                                src={item.coverUrl}
                                alt={`${item.title} cover`}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                No cover
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <p className="font-medium leading-snug">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.authors.length ? item.authors.join(", ") : "Unknown author"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.publishedYear ?? "-"} · {item.pageCount ?? "-"} pages · from {item.sources.join(" + ")}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            className="gap-2"
                            disabled={addingKey === item.key}
                            onClick={() => addBook(item)}
                          >
                            {addingKey === item.key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <BookPlus className="h-4 w-4" />
                            )}
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}

                    {!searching && hasSearched && hasQuery && items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No results for this query.</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload EPUB directly. We will parse it and try to match the book with catalog metadata.
                  </p>
                  <BookUpload
                    showCloseWhenDone
                    onRequestClose={handleClose}
                    onUploadingChange={setUploadInProgress}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
