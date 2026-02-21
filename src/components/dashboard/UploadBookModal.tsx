"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookUpload } from "@/components/BookUpload";

type Props = {
  triggerClassName?: string;
  onTriggerClick?: () => void;
};

export function UploadBookModal({ triggerClassName, onTriggerClick }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button
        className={triggerClassName}
        onClick={() => {
          onTriggerClick?.();
          setOpen(true);
        }}
      >
        Upload Book
      </Button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/45 p-3 pt-10 sm:p-6">
              <div className="relative w-full max-w-3xl rounded-md border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-lg font-semibold">Upload books</h3>
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close upload modal">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="max-h-[80vh] overflow-auto p-4">
                  <BookUpload />
                </div>
              </div>
            </div>
            ,
            document.body
          )
        : null}
    </>
  );
}
