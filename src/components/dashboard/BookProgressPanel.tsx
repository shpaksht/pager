"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CompletionStats = {
  actualDays: number;
  pagesPerDay: number;
  pagesPerMinute: number;
};

type Props = {
  bookId: string;
  startDate: string | null;
  hasStarted: boolean;
  estimatedEndDate: string | null;
  finishedAt: string | null;
  initialStats: CompletionStats | null;
};

function asInputDate(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

export function BookProgressPanel({
  bookId,
  startDate,
  hasStarted,
  estimatedEndDate,
  finishedAt,
  initialStats
}: Props) {
  const router = useRouter();
  const [started, setStarted] = useState(hasStarted);
  const [planStartDate, setPlanStartDate] = useState(startDate ?? todayInputDate());
  const [estimatedEnd, setEstimatedEnd] = useState<string | null>(estimatedEndDate);
  const [finishDate, setFinishDate] = useState(asInputDate(finishedAt));
  const [stats, setStats] = useState<CompletionStats | null>(initialStats);
  const [error, setError] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingFinish, setSavingFinish] = useState(false);

  const endDateLabel = useMemo(() => {
    if (!estimatedEnd) return "Not calculated";
    return new Date(estimatedEnd).toLocaleDateString("en-US");
  }, [estimatedEnd]);

  async function savePlan(event?: FormEvent) {
    event?.preventDefault();
    setSavingPlan(true);
    setError(null);

    const response = await fetch(`/api/books/${bookId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: planStartDate })
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not recalculate date");
      setSavingPlan(false);
      return;
    }

    setEstimatedEnd(data.plan.estimatedEndDate || null);
    setStarted(true);
    setSavingPlan(false);
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

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not save completion date");
      setSavingFinish(false);
      return;
    }

    setStats(data.stats);
    setSavingFinish(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reading Dates</CardTitle>
        <CardDescription>
          {started
            ? "Start date, estimated finish date, and actual finish date in one section."
            : "Reading date"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`grid gap-3 ${started ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
          <label className="grid gap-2 text-sm">
            Start Date
            <input
              type="date"
              className="h-10 rounded-md border border-border bg-card px-3"
              value={planStartDate}
              onChange={(event) => setPlanStartDate(event.target.value)}
            />
          </label>
          {started ? (
            <div className="grid gap-2 text-sm">
              <p className="text-muted-foreground">Estimated Finish Date</p>
              <div className="flex h-10 items-center rounded-md border border-border bg-card px-3">
                <strong>{endDateLabel}</strong>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div />
          <Button type="button" onClick={() => savePlan()} disabled={savingPlan} className="w-full sm:w-auto">
            {savingPlan ? "Starting..." : "Start"}
          </Button>
        </div>

        {started ? (
          <>
            <div className="border-t border-border" />
            <form className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={saveFinished}>
              <label className="grid gap-2 text-sm">
                Actual Finish Date
                <input
                  required
                  type="date"
                  className="h-10 rounded-md border border-border bg-card px-3"
                  value={finishDate}
                  onChange={(event) => setFinishDate(event.target.value)}
                />
              </label>
              <Button type="submit" className="w-full" disabled={savingFinish}>
                {savingFinish ? "Saving..." : "I finished it"}
              </Button>
            </form>
          </>
        ) : null}

        {stats && (
          <div className="grid gap-2 rounded-md border border-border bg-accent/40 p-3 text-sm">
            <p>
              Finished in: <strong>{stats.actualDays} days</strong>
            </p>
            <p>
              Average pace: <strong>{stats.pagesPerDay.toFixed(1)} pages/day</strong>
            </p>
            <p>
              Reading speed estimate: <strong>{stats.pagesPerMinute.toFixed(2)} pages/min</strong>
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
      </CardContent>
    </Card>
  );
}
