"use client";

import { useMemo, useState } from "react";
import type { DraftRequirement } from "@/lib/placeholder-workspace-data";
import { DraftReviewRow, type DraftRowState } from "@/components/workspace/draft-review-row";
import { ApproveBar } from "@/components/workspace/approve-bar";
import { PanelHeader } from "@/components/workspace/panel-header";

export function RequirementsDraftPanel({
  requirements,
  onClose,
}: {
  requirements: DraftRequirement[];
  onClose?: () => void;
}) {
  const [rowState, setRowState] = useState<Record<string, DraftRowState>>(() =>
    Object.fromEntries(requirements.map((r) => [r.key, r.state])),
  );

  const { approved, rejected } = useMemo(() => {
    const values = Object.values(rowState);
    return {
      approved: values.filter((s) => s === "approved").length,
      rejected: values.filter((s) => s === "rejected").length,
    };
  }, [rowState]);

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Requirements — draft"
        subtitle={`Gate 1 · ${requirements.length} extracted · review each, then approve together`}
        onClose={onClose}
      />

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {requirements.map((req) => (
          <DraftReviewRow
            key={req.key}
            itemKey={req.key}
            title={req.title}
            meta={req.acSummary}
            state={rowState[req.key]}
            onReject={() => setRowState((s) => ({ ...s, [req.key]: "rejected" }))}
            onUndo={() => setRowState((s) => ({ ...s, [req.key]: "pending" }))}
            onApprove={() => setRowState((s) => ({ ...s, [req.key]: "approved" }))}
          />
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
