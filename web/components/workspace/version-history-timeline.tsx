import type { VersionEntry } from "@/lib/placeholder-workspace-data";
import { cn } from "@/lib/utils";

function DiffLabel({ diff }: { diff: VersionEntry["diff"] }) {
  if (!diff) return null;
  const parts: { text: string; className: string }[] = [];
  if (diff.added)
    parts.push({
      text: `+${diff.added} added`,
      className: "text-emerald-600 dark:text-emerald-400",
    });
  if (diff.modified)
    parts.push({
      text: `~${diff.modified} modified`,
      className: "text-amber-600 dark:text-amber-400",
    });
  if (diff.removed)
    parts.push({
      text: `−${diff.removed} removed`,
      className: "text-amber-600 dark:text-amber-400",
    });
  if (parts.length === 0) return null;

  return (
    <p className="mt-0.5 font-mono text-xs">
      {parts.map((part, i) => (
        <span key={i} className={part.className}>
          {i > 0 && <span className="text-muted-foreground"> · </span>}
          {part.text}
        </span>
      ))}
    </p>
  );
}

export function VersionHistoryTimeline({ entries }: { entries: VersionEntry[] }) {
  return (
    <div className="relative space-y-5 pl-5">
      <div className="absolute top-1 bottom-1 left-1 w-px bg-border" />
      {entries.map((entry, i) => (
        <div key={i} className={cn("relative", entry.rejected && "opacity-55")}>
          <div className="absolute top-1 -left-4.5 h-2 w-2 rounded-full bg-primary" />
          <div className="flex items-center gap-2 text-sm font-medium">
            {entry.version === "rejected" ? "Rejected" : `Version ${entry.version}`}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {entry.date}
              {entry.origin ? ` · ${entry.origin}` : ""}
            </span>
          </div>
          <DiffLabel diff={entry.diff} />
          <p className="mt-1 text-sm text-muted-foreground">{entry.explanation}</p>
        </div>
      ))}
    </div>
  );
}
