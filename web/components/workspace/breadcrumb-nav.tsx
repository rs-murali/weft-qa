"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAui } from "@assistant-ui/react";
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
  const pathname = usePathname();
  const aui = useAui();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <TooltipIconButton
        tooltip={`Back to ${backLabel}`}
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => {
          // Next.js router ignores pushing to the same route it believes it is on.
          // If we morphed in-place using pushState, the active pathname is still the overview route
          // (equal to backHref), but the browser URL shows the chat route.
          // In that case, switch to a new thread (which resets messages and triggers morph back to overview content)
          // and restore the overview URL in browser history.
          if (pathname === backHref) {
            aui.threads().switchToNewThread();
            window.history.pushState(null, "", backHref);
          } else {
            router.push(backHref);
          }
        }}
      >
        <ArrowLeft className="h-4 w-4" />
      </TooltipIconButton>
      <span className="truncate text-sm font-medium">{current}</span>
    </div>
  );
}
