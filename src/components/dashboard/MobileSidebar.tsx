"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { DashboardSidebarContent } from "@/components/dashboard/DashboardSidebarContent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  login: string;
};

export function MobileSidebar({ login }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pager</p>
            <h2 className="text-xl">Bookshelf</h2>
          </div>
          <Button variant="outline" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/45 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] border-r border-border bg-card p-4 shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-3 z-10"
        >
          <X className="h-5 w-5" />
        </Button>

        <DashboardSidebarContent login={login} onNavigate={() => setOpen(false)} className="pr-8" />
      </div>
    </>
  );
}
