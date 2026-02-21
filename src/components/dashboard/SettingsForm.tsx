"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Settings = {
  monHours: number;
  tueHours: number;
  wedHours: number;
  thuHours: number;
  friHours: number;
  satHours: number;
  sunHours: number;
};

type Props = {
  initialSettings: Settings;
};

const DAYS: Array<{ key: keyof Settings; label: string }> = [
  { key: "monHours", label: "Mon" },
  { key: "tueHours", label: "Tue" },
  { key: "wedHours", label: "Wed" },
  { key: "thuHours", label: "Thu" },
  { key: "friHours", label: "Fri" },
  { key: "satHours", label: "Sat" },
  { key: "sunHours", label: "Sun" }
];

function normalizeSettings(input: Partial<Record<keyof Settings, unknown>>): Settings {
  return {
    monHours: Number(input.monHours ?? 0),
    tueHours: Number(input.tueHours ?? 0),
    wedHours: Number(input.wedHours ?? 0),
    thuHours: Number(input.thuHours ?? 0),
    friHours: Number(input.friHours ?? 0),
    satHours: Number(input.satHours ?? 0),
    sunHours: Number(input.sunHours ?? 0)
  };
}

export function SettingsForm({ initialSettings }: Props) {
  const [values, setValues] = useState<Settings>(normalizeSettings(initialSettings));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalHours = useMemo(() => {
    return Object.values(values).reduce((acc, value) => acc + Number(value || 0), 0);
  }, [values]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not save settings");
      setLoading(false);
      return;
    }

    setValues(normalizeSettings(data.settings ?? {}));
    setMessage("Settings saved");
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reading Plan Settings</CardTitle>
        <CardDescription>How many hours per day you can usually read.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <label key={day.key} className="grid gap-1 text-sm">
                  {day.label}
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                    value={values[day.key]}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [day.key]: Number(event.target.value)
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Total weekly hours: {totalHours.toFixed(1)}</p>

          <Button disabled={loading} type="submit" className="w-full sm:w-auto">
            {loading ? "Saving..." : "Save settings"}
          </Button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
