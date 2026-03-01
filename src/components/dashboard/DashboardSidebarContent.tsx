"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LibraryBig } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { CatalogSearchModal } from "@/components/dashboard/CatalogSearchModal";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  login: string;
  onNavigate?: () => void;
  className?: string;
};

export function DashboardSidebarContent({ login, onNavigate, className }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard/speed-test");
    router.prefetch("/dashboard/settings");
  }, [router]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="mb-5">
        <Link href="/dashboard" onClick={onNavigate} aria-label="Open library">
          <AppLogo priority />
        </Link>
      </div>

      <nav className="grid gap-2">
        <CatalogSearchModal triggerVariant="default" triggerClassName="justify-start" onTriggerClick={onNavigate} />

        <Button asChild variant="outline" className="justify-start gap-2" onClick={onNavigate}>
          <Link href="/dashboard">
            <LibraryBig className="h-4 w-4" />
            Library
          </Link>
        </Button>
      </nav>

      <div className="mt-auto space-y-2 pt-5">
        <UserMenu login={login} />
      </div>
    </div>
  );
}
