"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  bookId?: string;
  className?: string;
};

export function BookCover({ title, bookId, className }: Props) {
  const [imageError, setImageError] = useState(false);

  const initials = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "BK";

  const coverSrc = bookId && !imageError ? `/api/books/${bookId}/cover` : null;

  return (
    <div
      className={cn(
        "book-cover relative flex h-28 w-20 min-w-20 flex-col justify-between overflow-hidden rounded-sm border border-black/20 p-2 text-white shadow",
        className
      )}
    >
      {coverSrc ? (
        <Image
          src={coverSrc}
          alt={`${title} cover`}
          fill
          unoptimized
          className="absolute inset-0 object-cover"
          onError={() => setImageError(true)}
        />
      ) : null}

      <div className="relative z-10">
        <BookOpen className="h-4 w-4 opacity-85" />
      </div>
      <div className="relative z-10 self-start rounded bg-black/35 px-2 py-1 text-xs font-semibold tracking-wide">
        {initials}
      </div>
    </div>
  );
}
