"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { readDocumentTheme, toggleDocumentTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(readDocumentTheme() === "dark");
  }, []);

  return (
    <TooltipIconButton
      tooltip={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="h-7 w-7 text-gray-400 hover:text-black dark:text-muted-foreground dark:hover:text-foreground"
      onClick={() => setIsDark(toggleDocumentTheme() === "dark")}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </TooltipIconButton>
  );
}
