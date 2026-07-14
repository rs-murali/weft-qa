"use client";

import { useMemo, useState } from "react";
import type { DraftTestCase } from "@/lib/placeholder-workspace-data";
import { DraftReviewRow, type DraftRowState } from "@/components/workspace/draft-review-row";
import { ApproveBar } from "@/components/workspace/approve-bar";
import { PanelHeader } from "@/components/workspace/panel-header";

export function TestCasesDraftPanel({
  testCases,
  onClose,
}: {
  testCases: DraftTestCase[];
  onClose?: () => void;
}) {
  const [rowState, setRowState] = useState<Record<string, DraftRowState>>(() =>
    Object.fromEntries(testCases.map((tc) => [tc.key, tc.state])),
  );

  const { approved, rejected } = useMemo(() => {
    const values = Object.values(rowState);
    return {
      approved: values.filter((s) => s === "approved").length,
      rejected: values.filter((s) => s === "rejected").length,
    };
  }, [rowState]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { requirementKey: string; requirementTitle: string; items: DraftTestCase[] }
    >();
    for (const tc of testCases) {
      const existing = map.get(tc.requirementKey);
      if (existing) existing.items.push(tc);
      else
        map.set(tc.requirementKey, {
          requirementKey: tc.requirementKey,
          requirementTitle: tc.requirementTitle,
          items: [tc],
        });
    }
    return Array.from(map.values());
  }, [testCases]);

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Test cases — draft"
        subtitle="Gate 2 · Gherkin scenarios linked to each acceptance criterion"
        onClose={onClose}
      />

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {groups.map((group) => (
          <div key={group.requirementKey}>
            <p className="mb-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
              {group.requirementKey} · {group.requirementTitle}
            </p>
            <div className="space-y-2">
              {group.items.map((tc) => (
                <DraftReviewRow
                  key={tc.key}
                  itemKey={tc.key}
                  title={tc.title}
                  gherkin={tc.gherkin}
                  state={rowState[tc.key]}
                  onReject={() => setRowState((s) => ({ ...s, [tc.key]: "rejected" }))}
                  onUndo={() => setRowState((s) => ({ ...s, [tc.key]: "pending" }))}
                  onApprove={() => setRowState((s) => ({ ...s, [tc.key]: "approved" }))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <ApproveBar
        approvedCount={approved}
        rejectedCount={rejected}
        onApproveAll={() =>
          setRowState((s) =>
            Object.fromEntries(
              Object.entries(s).map(([k, v]) => [k, v === "rejected" ? v : "approved"]),
            ),
          )
        }
      />
    </div>
  );
}
