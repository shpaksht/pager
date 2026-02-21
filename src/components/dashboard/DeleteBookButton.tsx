"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  bookId: string;
  bookTitle: string;
};

export function DeleteBookButton({ bookId, bookTitle }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const confirmed = window.confirm(`Delete "${bookTitle}"? This cannot be undone.`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not delete book");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={onDelete} disabled={loading} className="gap-2 text-red-700">
        <Trash2 className="h-4 w-4" />
        {loading ? "Deleting..." : "Delete book"}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
