"use client";

import { FormEvent, useMemo, useState } from "react";

type Props = {
  bookId: string;
  defaultValues?: {
    monHours: number;
    tueHours: number;
    wedHours: number;
    thuHours: number;
    friHours: number;
    satHours: number;
    sunHours: number;
  };
  startDate: string;
  requiredHours: number | null;
  completionDate: string | null;
};

const DAYS: Array<{ key: keyof NonNullable<Props["defaultValues"]>; label: string }> = [
  { key: "monHours", label: "Понедельник" },
  { key: "tueHours", label: "Вторник" },
  { key: "wedHours", label: "Среда" },
  { key: "thuHours", label: "Четверг" },
  { key: "friHours", label: "Пятница" },
  { key: "satHours", label: "Суббота" },
  { key: "sunHours", label: "Воскресенье" }
];

const emptyState = {
  monHours: 0,
  tueHours: 0,
  wedHours: 0,
  thuHours: 0,
  friHours: 0,
  satHours: 0,
  sunHours: 0
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

export function BookPlanner({
  bookId,
  defaultValues,
  startDate,
  requiredHours,
  completionDate
}: Props) {
  const [values, setValues] = useState(defaultValues ?? emptyState);
  const [planStartDate, setPlanStartDate] = useState(startDate);
  const [result, setResult] = useState<string | null>(completionDate);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totalWeekHours = useMemo(() => Object.values(values).reduce((acc, value) => acc + value, 0), [values]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/books/${bookId}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: planStartDate,
        ...values
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Ошибка сохранения плана");
      setLoading(false);
      return;
    }

    setResult(data.plan.estimatedEndDate || null);
    setLoading(false);
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>План чтения по дням недели</h2>
      <p className="muted">Укажите дату старта и сколько часов можете читать в каждый день.</p>

      <div className="date-block">
        <label>
          Дата начала
          <input
            type="date"
            value={planStartDate}
            onChange={(event) => setPlanStartDate(event.target.value)}
          />
        </label>

        <div className="row">
          <button type="button" className="ghost-button" onClick={() => setPlanStartDate((prev) => shiftDate(prev, -1))}>
            -1 день
          </button>
          <button type="button" className="ghost-button" onClick={() => setPlanStartDate((prev) => shiftDate(prev, 1))}>
            +1 день
          </button>
        </div>

        <p>
          Дата окончания: <strong>{result ? new Date(result).toLocaleDateString("ru-RU") : "не рассчитана"}</strong>
        </p>
      </div>

      <div className="days-grid">
        {DAYS.map((day) => (
          <label key={day.key}>
            {day.label}
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
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

      <p className="muted">Всего часов в неделю: {totalWeekHours.toFixed(1)}</p>
      {requiredHours !== null && <p className="muted">Нужно часов на книгу: {requiredHours.toFixed(1)}</p>}

      <button disabled={loading} type="submit">
        {loading ? "Считаем..." : "Рассчитать дату завершения"}
      </button>

      {error && <p className="error">{error}</p>}
    </form>
  );
}
