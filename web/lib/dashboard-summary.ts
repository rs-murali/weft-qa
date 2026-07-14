import type { NeedsAttentionItem, Workspace } from "@/lib/api";

export type DashboardSummary = {
  workspace_count: number;
  avg_coverage_pct: number | null;
  needs_review_count: number;
  orphaned_count: number;
  needs_attention: NeedsAttentionItem[];
};

export function deriveDashboardSummary(workspaces: Workspace[]): DashboardSummary {
  const coveragePcts = workspaces
    .map((ws) => ws.stats.coverage_pct)
    .filter((pct): pct is number => pct !== null);

  return {
    workspace_count: workspaces.length,
    avg_coverage_pct:
      coveragePcts.length === 0
        ? null
        : coveragePcts.reduce((sum, pct) => sum + pct, 0) / coveragePcts.length,
    needs_review_count: workspaces.reduce((sum, ws) => sum + ws.stats.needs_review_count, 0),
    orphaned_count: workspaces.reduce((sum, ws) => sum + ws.stats.orphaned_count, 0),
    needs_attention: [],
  };
}
