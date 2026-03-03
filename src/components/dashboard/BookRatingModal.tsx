"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RatingStarsInput } from "@/components/dashboard/RatingStarsInput";

type Props = {
  open: boolean;
  bookId: string | null;
  bookTitle: string;
  initialRating: number | null;
  initialComment: string;
  onClose: () => void;
  onSaved: (payload: { rating: number | null; reviewComment: string | null }) => void;
};

export function BookRatingModal({
  open,
  bookId,
  bookTitle,
  initialRating,
  initialComment,
  onClose,
  onSaved
}: Props) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRating(initialRating);
    setComment(initialComment);
    setError(null);
    setSaving(false);
  }, [open, initialComment, initialRating]);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!bookId || !rating) {
      setError("Please choose a rating from 1 to 5.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, reviewComment: comment })
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      rating?: number | null;
      reviewComment?: string | null;
    };

    if (!response.ok) {
      setError(data.error ?? "Could not save rating");
      setSaving(false);
      return;
    }

    onSaved({
      rating: typeof data.rating === "number" ? data.rating : rating,
      reviewComment: typeof data.reviewComment === "string" ? data.reviewComment : null
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/45 p-4" onClick={onClose}>
      <div
        className="mx-auto mt-20 w-full max-w-lg rounded-md border border-border bg-card p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <p className="text-base font-semibold">Rate this book</p>
            <p className="text-sm text-muted-foreground">Leave a quick review for &quot;{bookTitle}&quot;.</p>
          </div>

          <RatingStarsInput value={rating} onChange={setRating} disabled={saving} />

          <label className="grid gap-2 text-sm">
            Comment
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="What did you think about this book?"
              maxLength={2000}
              rows={4}
              disabled={saving}
              className="w-full rounded-md border border-border bg-card px-3 py-2"
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
