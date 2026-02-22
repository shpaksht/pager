"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  bookId: string;
  hasStarted: boolean;
  estimatedEndDate: string | null;
  finishedAt: string | null;
};

function asInputDate(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

export function BookReadingControlsInline({
  bookId,
  hasStarted,
  estimatedEndDate,
  finishedAt
}: Props) {
  const router = useRouter();
  const [started, setStarted] = useState(hasStarted);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayInputDate());
  const [estimatedEnd, setEstimatedEnd] = useState<string | null>(estimatedEndDate);
  const [finishDate, setFinishDate] = useState(asInputDate(finishedAt) || todayInputDate());
  const [savingStart, setSavingStart] = useState(false);
  const [savingFinish, setSavingFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedEndLabel = useMemo(() => {
    if (!estimatedEnd) return "-";
    return new Date(estimatedEnd).toLocaleDateString("en-US");
  }, [estimatedEnd]);

  async function startReading(event: FormEvent) {
    event.preventDefault();
    setSavingStart(true);
    setError(null);

    const response = await fetch(`/api/books/${bookId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate })
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      plan?: { estimatedEndDate?: string | null };
    };

    if (!response.ok) {
      setError(data.error ?? "Could not start reading");
      setSavingStart(false);
      return;
    }

    setStarted(true);
    setEstimatedEnd(data.plan?.estimatedEndDate ?? null);
    setStartModalOpen(false);
    setSavingStart(false);
    router.refresh();
  }

  async function saveFinished(event: FormEvent) {
    event.preventDefault();
    setSavingFinish(true);
    setError(null);

    const response = await fetch(`/api/books/${bookId}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finishedDate: finishDate })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Could not save finish date");
      setSavingFinish(false);
      return;
    }

    setFinishModalOpen(false);
    setSavingFinish(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {!started ? (
        <div className="flex items-center justify-start">
          <Button type="button" onClick={() => setStartModalOpen(true)}>
            Start
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <Button type="button" onClick={() => setFinishModalOpen(true)}>
            Finish
          </Button>
          <div className="grid gap-1 text-sm">
            <p className="text-muted-foreground">Estimated Finish Date</p>
            <div className="flex h-9 items-center rounded-md border border-border bg-card px-3">
              <strong>{estimatedEndLabel}</strong>
            </div>
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {startModalOpen ? (
        <div className="fixed inset-0 z-[10000] bg-black/45 p-4" onClick={() => setStartModalOpen(false)}>
          <div
            className="mx-auto mt-24 w-full max-w-md rounded-md border border-border bg-card p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <form className="space-y-4" onSubmit={startReading}>
              <div>
                <p className="text-base font-semibold">Start reading</p>
                <p className="text-sm text-muted-foreground">Choose the date when you started this book.</p>
              </div>

              <label className="grid gap-2 text-sm">
                Start Date
                <input
                  type="date"
                  className="h-10 rounded-md border border-border bg-card px-3"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </label>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setStartModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingStart}>
                  {savingStart ? "Starting..." : "Start"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {finishModalOpen ? (
        <div className="fixed inset-0 z-[10000] bg-black/45 p-4" onClick={() => setFinishModalOpen(false)}>
          <div
            className="mx-auto mt-24 w-full max-w-md rounded-md border border-border bg-card p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <form className="space-y-4" onSubmit={saveFinished}>
              <div>
                <p className="text-base font-semibold">Finish reading</p>
                <p className="text-sm text-muted-foreground">Choose the date when you finished this book.</p>
              </div>

              <label className="grid gap-2 text-sm">
                Finish Date
                <input
                  type="date"
                  className="h-10 rounded-md border border-border bg-card px-3"
                  value={finishDate}
                  onChange={(event) => setFinishDate(event.target.value)}
                  required
                />
              </label>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setFinishModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingFinish}>
                  {savingFinish ? "Saving..." : "Finish"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
