import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Workspace } from "@/lib/api";

function coverageBadge(pct: number | null): { label: string; className: string } {
  if (pct === null) return { label: "No data yet", className: "bg-muted text-muted-foreground" };
  const rounded = Math.round(pct);
  if (rounded >= 70)
    return {
      label: `${rounded}% covered`,
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
  if (rounded >= 40)
    return {
      label: `${rounded}% covered`,
      className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
  return {
    label: `${rounded}% covered`,
    className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const coverage = coverageBadge(workspace.stats.coverage_pct);

  return (
    <Link
      href={`/workspaces/${workspace.id}`}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/20"
    >
      <div>
        <h3 className="text-sm font-semibold">{workspace.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{workspace.description}</p>
      </div>
      <div className="mt-auto flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground/70">
          Updated {relativeTime(workspace.updated_at)}
        </span>
        <Badge variant="secondary" className={coverage.className}>
          {coverage.label}
        </Badge>
      </div>
    </Link>
  );
}
