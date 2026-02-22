"use client";

import { useEffect, useMemo, useState } from "react";
import { estimateReadingHours } from "@/lib/reading";

type Props = {
  bookId: string;
  status: "Pending" | "In Progress" | "Completed";
  wordCount: number;
  estimatedPages: number;
  requiredHours: number | null;
  wordsPerMinute: number | null;
  initialReadPercent: number;
};

type ProgressEventPayload = {
  bookId: string;
  percent: number;
};

export function BookTopMetricsLive({
  bookId,
  status,
  wordCount,
  estimatedPages,
  requiredHours,
  wordsPerMinute,
  initialReadPercent
}: Props) {
  const [readPercent, setReadPercent] = useState(initialReadPercent);
  const isInProgress = status === "In Progress";

  useEffect(() => {
    setReadPercent(initialReadPercent);
  }, [initialReadPercent]);

  useEffect(() => {
    function onProgressUpdated(event: Event) {
      const detail = (event as CustomEvent<ProgressEventPayload>).detail;
      if (!detail || detail.bookId !== bookId) return;
      setReadPercent(Math.max(0, Math.min(100, Math.round(detail.percent))));
    }

    window.addEventListener("book-progress-updated", onProgressUpdated);
    return () => window.removeEventListener("book-progress-updated", onProgressUpdated);
  }, [bookId]);

  const remainingHours = useMemo(() => {
    const estimatedReadWords = Math.round((readPercent / 100) * wordCount);
    const remainingWords = Math.max(0, wordCount - estimatedReadWords);
    return wordsPerMinute ? estimateReadingHours(remainingWords, wordsPerMinute) : null;
  }, [readPercent, wordCount, wordsPerMinute]);

  return (
    <div className="space-y-4">
      <div className={isInProgress ? "grid gap-6 sm:grid-cols-3 lg:grid-cols-5" : "grid gap-6 sm:grid-cols-3"}>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Words</p>
          <p className="text-4xl font-semibold leading-none">{wordCount.toLocaleString("en-US")}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Pages</p>
          <p className="text-4xl font-semibold leading-none">{estimatedPages.toLocaleString("en-US")}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Reading Time</p>
          <p className="text-4xl font-semibold leading-none">
            {requiredHours !== null ? `~${requiredHours.toFixed(1)} h` : "-"}
          </p>
        </div>
        {isInProgress ? (
          <>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Read</p>
              <p className="text-4xl font-semibold leading-none">{readPercent}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Remaining Time</p>
              <p className="text-4xl font-semibold leading-none">
                {remainingHours !== null ? `~${remainingHours.toFixed(1)} h` : "-"}
              </p>
            </div>
          </>
        ) : null}
      </div>

      {isInProgress ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reading progress</span>
            <strong>{readPercent}%</strong>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-accent/40">
            <div className="h-full bg-primary transition-all" style={{ width: `${readPercent}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
