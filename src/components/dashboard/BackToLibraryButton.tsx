"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackToLibraryButton() {
  const router = useRouter();

  function onBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }

  return (
    <Button type="button" variant="outline" className="gap-1.5" onClick={onBack}>
      <ChevronLeft className="h-4 w-4" />
      Back
    </Button>
  );
}
