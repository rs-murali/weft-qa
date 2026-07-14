"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TooltipIconButton } from "@/components/tooltip-icon-button";

export function BreadcrumbNav({
  backHref,
  backLabel,
  current,
}: {
  backHref: string;
  backLabel: string;
  current: string;
}) {
  const router = useRouter();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <TooltipIconButton
        tooltip={`Back to ${backLabel}`}
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(backHref)}
      >
        <ArrowLeft className="h-4 w-4" />
      </TooltipIconButton>
      <span className="truncate text-sm font-medium">{current}</span>
    </div>
  );
}
