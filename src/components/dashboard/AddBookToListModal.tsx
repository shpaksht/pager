"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalOverlay } from "@/components/ui/modal-overlay";

type ReadingListOption = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  bookId: string | null;
  bookTitle: string;
  lists: ReadingListOption[];
  onClose: () => void;
};

export function AddBookToListModal({ open, bookId, bookTitle, lists, onClose }: Props) {
  const [selectedListId, setSelectedListId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) return null;

  async function addToList() {
    if (!bookId || !selectedListId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/lists/${selectedListId}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Could not add book to list");
      setSaving(false);
      return;
    }

    const matchedList = lists.find((list) => list.id === selectedListId);
    setSuccess(matchedList ? `Added to "${matchedList.name}"` : "Added to list");
    setSaving(false);
  }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div
        className="w-full max-w-md rounded-md border border-border bg-card p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold">Add to list</p>
            <p className="text-sm text-muted-foreground">{bookTitle}</p>
          </div>

          {lists.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">You do not have any lists yet.</p>
              <Button asChild type="button" className="w-full">
                <Link href="/dashboard/lists" onClick={onClose}>
                  Create a list
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <label className="grid gap-2 text-sm">
                List
                <select
                  value={selectedListId}
                  onChange={(event) => setSelectedListId(event.target.value)}
                  className="h-10 rounded-md border border-border bg-card px-3"
                >
                  <option value="">Select a list</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </label>

              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button type="button" disabled={!selectedListId || saving} onClick={() => void addToList()}>
                  {saving ? "Adding..." : "Add"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}
