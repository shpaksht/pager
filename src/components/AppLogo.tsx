import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  priority?: boolean;
};

export function AppLogo({ className, priority = false }: Props) {
  return (
    <Image
      src="/logo.svg"
      alt="Pager"
      width={180}
      height={44}
      priority={priority}
      className={cn("h-auto w-[110px]", className)}
    />
  );
}
