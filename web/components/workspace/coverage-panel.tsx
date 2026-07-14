import type { CoverageRow } from "@/lib/placeholder-workspace-data";
import { WeaveThreadBar, WeaveLegend } from "@/components/workspace/weave-threads";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PanelHeader } from "@/components/workspace/panel-header";

const PILL_VARIANT: Record<CoverageRow["pill"], string> = {
  Covered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Partial: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Missing: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Removed: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const REMEDIATION_ACTIONS: Record<"needs_review" | "orphaned", string[]> = {
  needs_review: ["Regenerate", "Edit", "Confirm still valid"],
  orphaned: ["Re-link", "Archive", "Delete"],
};

export function CoveragePanel({ rows, onClose }: { rows: CoverageRow[]; onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Coverage matrix"
        subtitle="Computed at read time from requirement ↔ test-case links — never stored"
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-xs tracking-wide text-muted-foreground uppercase">
              <th className="pb-2 font-medium">Requirement</th>
              <th className="pb-2 font-medium">Threads</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t">
                <td className="py-2.5 pr-4 align-top">
                  <div className="flex items-center gap-2">
                    {row.key}
                    {row.tombstoned && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        tombstoned
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{row.title}</div>
                </td>
                <td className="py-2.5 pr-4 align-top">
                  <div className="flex items-center gap-1">
                    {row.threads.map((thread, i) =>
                      thread.remediation ? (
                        <Popover key={i}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              aria-label={`${thread.label} — open actions`}
                              className="rounded p-0.5 hover:bg-accent"
                            >
                              <WeaveThreadBar status={thread.status} title={thread.label} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-1.5">
                            <p className="px-2 py-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                              {thread.label} · {thread.remediation}
                            </p>
                            {REMEDIATION_ACTIONS[thread.remediation].map((action) => (
                              <button
                                key={action}
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                              >
                                {action}
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <WeaveThreadBar key={i} status={thread.status} title={thread.label} />
                      ),
                    )}
                  </div>
                </td>
                <td className="py-2.5 align-top">
                  <Badge className={PILL_VARIANT[row.pill]}>{row.pill}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <WeaveLegend className="mt-5" />
      </div>
    </div>
  );
}
