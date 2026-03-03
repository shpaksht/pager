"use client";

import { useState } from "react";
import { RatingStarsInput } from "@/components/dashboard/RatingStarsInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  bookId: string;
  initialRating: number | null;
  initialComment: string | null;
};

export function BookRatingInline({ bookId, initialRating, initialComment }: Props) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [comment, setComment] = useState(initialComment ?? "");
  const [draftComment, setDraftComment] = useState(initialComment ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextRating: number) {
    if (!nextRating) {
      setError("Please choose a rating from 1 to 5.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    const response = await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: nextRating, reviewComment: draftComment })
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

    const savedRating = typeof data.rating === "number" ? data.rating : nextRating;
    const savedComment = typeof data.reviewComment === "string" ? data.reviewComment : "";
    setRating(savedRating);
    setComment(savedComment);
    setSaving(false);
    setEditorOpen(false);
    setSaved(true);
  }

  function onRate(value: number) {
    setRating(value);
    setDraftComment(comment);
    setSaved(false);
    setError(null);
    setEditorOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate this book</CardTitle>
        <CardDescription>Click stars to rate, then leave a comment in the dropdown.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <RatingStarsInput value={rating} onChange={onRate} disabled={saving} />

        {editorOpen ? (
          <div className="space-y-3 rounded-md border border-border bg-accent/20 p-3">
            <label className="grid gap-2 text-sm">
              Comment
              <textarea
                value={draftComment}
                onChange={(event) => setDraftComment(event.target.value)}
                placeholder="Your review notes..."
                maxLength={2000}
                rows={5}
                disabled={saving}
                className="w-full rounded-md border border-border bg-card px-3 py-2"
              />
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => save(rating ?? 0)} disabled={saving || !rating}>
                {saving ? "Saving..." : "Save review"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftComment(comment);
                  setEditorOpen(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-700">Saved.</p> : null}
      </CardContent>
    </Card>
  );
}
