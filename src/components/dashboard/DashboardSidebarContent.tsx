"use client";

import Link from "next/link";
import { BookMarked, LibraryBig } from "lucide-react";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { UploadBookModal } from "@/components/dashboard/UploadBookModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  login: string;
  onNavigate?: () => void;
  className?: string;
};

export function DashboardSidebarContent({ login, onNavigate, className }: Props) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pager</p>
        <h2 className="mt-1 text-2xl">Bookshelf</h2>
      </div>

      <nav className="grid gap-2">
        <UploadBookModal triggerClassName="justify-start" onTriggerClick={onNavigate} />

        <Button asChild variant="outline" className="justify-start gap-2" onClick={onNavigate}>
          <Link href="/dashboard">
            <LibraryBig className="h-4 w-4" />
            Library
          </Link>
        </Button>
      </nav>

      <div className="mt-auto space-y-2 pt-5">
        <Button asChild variant="ghost" className="w-full justify-start gap-2" onClick={onNavigate}>
          <Link href="/dashboard/speed-test">
            <BookMarked className="h-4 w-4" />
            Speed Test
          </Link>
        </Button>
        <UserMenu login={login} />
      </div>
    </div>
  );
}
