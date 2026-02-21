"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CompletionStats = {
  actualDays: number;
  pagesPerDay: number;
  pagesPerMinute: number;
};

type Props = {
  bookId: string;
  startDate: string;
  estimatedEndDate: string | null;
  finishedAt: string | null;
  initialStats: CompletionStats | null;
};

function shiftDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asInputDate(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function BookProgressPanel({
  bookId,
  startDate,
  estimatedEndDate,
  finishedAt,
  initialStats
}: Props) {
  const [planStartDate, setPlanStartDate] = useState(startDate);
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
    setSavingPlan(false);
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
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reading Dates</CardTitle>
        <CardDescription>Start date, estimated finish date, and actual finish date in one section.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            Start Date
            <input
              type="date"
              className="h-10 rounded-md border border-border bg-card px-3"
              value={planStartDate}
              onChange={(event) => setPlanStartDate(event.target.value)}
            />
          </label>
          <div className="grid gap-2 text-sm">
            <p className="text-muted-foreground">Estimated Finish Date</p>
            <div className="flex h-10 items-center rounded-md border border-border bg-card px-3">
              <strong>{endDateLabel}</strong>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-end">
          <Button type="button" variant="outline" onClick={() => setPlanStartDate((prev) => shiftDate(prev, -1))}>
            -1 day
          </Button>
          <Button type="button" variant="outline" onClick={() => setPlanStartDate((prev) => shiftDate(prev, 1))}>
            +1 day
          </Button>
          <Button type="button" onClick={() => savePlan()} disabled={savingPlan}>
            {savingPlan ? "Calculating..." : "Recalculate"}
          </Button>
        </div>

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
