import type { DashboardSummary } from "@/lib/dashboard-summary";

function formatCoverage(pct: number | null): string {
  return pct === null ? "—" : `${Math.round(pct)}%`;
}

export function StatCards({ summary }: { summary: DashboardSummary }) {
  const stats = [
    { label: "Workspaces", value: String(summary.workspace_count), tone: "" },
    { label: "Avg. coverage", value: formatCoverage(summary.avg_coverage_pct), tone: "" },
    {
      label: "Needs review",
      value: String(summary.needs_review_count),
      tone: summary.needs_review_count > 0 ? "text-amber-600 dark:text-amber-400" : "",
    },
    {
      label: "Orphaned",
      value: String(summary.orphaned_count),
      tone: summary.orphaned_count > 0 ? "text-red-600 dark:text-red-400" : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className={`mt-1.5 text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
