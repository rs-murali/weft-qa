"use client";

import { useRouter } from "next/navigation";
import { Layers, LogOut } from "lucide-react";
import { clearToken } from "@/lib/auth";
import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-gray-100 px-4 dark:border-border">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-black dark:bg-primary dark:text-primary-foreground">
          <Layers className="h-3 w-3 text-white dark:text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-black dark:text-foreground">
          weft
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <TooltipIconButton
          tooltip="Sign out"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-black dark:text-muted-foreground dark:hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
        </TooltipIconButton>
      </div>
    </header>
  );
}
