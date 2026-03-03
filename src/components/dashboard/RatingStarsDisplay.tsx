"use client";

import { Star } from "lucide-react";

type Props = {
  value: number;
  size?: "sm" | "md";
};

export function RatingStarsDisplay({ value, size = "md" }: Props) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const isActive = value >= starValue;
        return (
          <Star
            key={starValue}
            className={[
              size === "sm" ? "h-4 w-4" : "h-5 w-5",
              isActive ? "fill-amber-400 text-amber-500" : "text-muted-foreground/30"
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
