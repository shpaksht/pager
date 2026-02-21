export type WeekSchedule = {
  monHours: number;
  tueHours: number;
  wedHours: number;
  thuHours: number;
  friHours: number;
  satHours: number;
  sunHours: number;
};

export function estimateReadingHours(wordCount: number, wordsPerMinute: number) {
  if (wordsPerMinute <= 0) return 0;
  return wordCount / wordsPerMinute / 60;
}

const DAY_KEYS: Array<keyof WeekSchedule> = [
  "sunHours",
  "monHours",
  "tueHours",
  "wedHours",
  "thuHours",
  "friHours",
  "satHours"
];

export function estimateCompletionDate(
  requiredHours: number,
  schedule: WeekSchedule,
  startDateInput?: Date
) {
  const hasAnyDay = Object.values(schedule).some((hours) => hours > 0);
  if (!hasAnyDay || requiredHours <= 0) {
    return null;
  }

  let remaining = requiredHours;
  const current = startDateInput ? new Date(startDateInput) : new Date();
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < 3650; i += 1) {
    const weekday = current.getDay();
    const key = DAY_KEYS[weekday];
    const dayHours = schedule[key];

    if (dayHours > 0) {
      remaining -= dayHours;
      if (remaining <= 0) {
        return new Date(current);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return null;
}

export function daysBetweenInclusive(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diff = end.getTime() - start.getTime();
  if (diff < 0) return 0;

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function estimatePagesPerMinute(wordsPerMinute: number) {
  if (wordsPerMinute <= 0) return 0;
  return wordsPerMinute / 300;
}
