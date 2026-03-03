"use client";

import { Star } from "lucide-react";

type Props = {
  value: number | null;
  onChange: (value: number) => void;
  size?: "sm" | "md";
  disabled?: boolean;
};

export function RatingStarsInput({ value, onChange, size = "md", disabled = false }: Props) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const isActive = (value ?? 0) >= starValue;
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            disabled={disabled}
            className="rounded-sm p-0.5 transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
            aria-label={`Set rating to ${starValue}`}
          >
            <Star
              className={[
                size === "sm" ? "h-4 w-4" : "h-5 w-5",
                isActive ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40"
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}
