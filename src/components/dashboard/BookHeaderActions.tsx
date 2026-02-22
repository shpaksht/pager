"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookFixMatchModal } from "@/components/dashboard/BookFixMatchModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { buildMatchQueryFromBook } from "@/lib/book-title";

type Props = {
  bookId: string;
  bookTitle: string;
  bookFileName: string;
  isMatched: boolean;
};

export function BookHeaderActions({ bookId, bookTitle, bookFileName, isMatched }: Props) {
  const router = useRouter();
  const [matchOpen, setMatchOpen] = useState(false);

  async function deleteBook() {
    const confirmed = window.confirm(`Delete "${bookTitle}"? This cannot be undone.`);
    if (!confirmed) return;

    const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
    if (!response.ok) return;

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Book actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setMatchOpen(true);
            }}
          >
            {isMatched ? "Fix match" : "Match"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-700"
            onSelect={() => {
              void deleteBook();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete book
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BookFixMatchModal
        open={matchOpen}
        bookId={bookId}
        initialQuery={buildMatchQueryFromBook(bookTitle, bookFileName)}
        onClose={() => setMatchOpen(false)}
        onMatched={() => router.refresh()}
      />
    </>
  );
}
