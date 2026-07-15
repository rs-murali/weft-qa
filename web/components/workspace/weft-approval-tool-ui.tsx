"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  APPROVAL_TOOL_NAME,
  type ApprovalArgs,
  type ApprovalResult,
  type WeftStage,
} from "@/lib/chat-adapter";

const STAGE_COPY: Record<WeftStage, { title: string; gate: string }> = {
  extract_requirements: { title: "Requirements — draft", gate: "Gate 1" },
  generate_test_cases: { title: "Test cases — draft", gate: "Gate 2" },
};

function DraftItem({ id, title, body }: { id: string; title: string; body?: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-sm">
        <span className="mr-1.5 font-mono text-xs text-muted-foreground">{id}</span>
        <span className="font-medium">{title}</span>
      </div>
      {body && (
        <pre className="mt-2 rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
          {body}
        </pre>
      )}
    </div>
  );
}

function Settled({ result }: { result: ApprovalResult }) {
  if (result.approved) {
    return (
      <p className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="h-4 w-4" />
        Approved
      </p>
    );
  }
  return (
    <div className="rounded-md border p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <X className="h-4 w-4" />
        Sent back for a re-draft
      </p>
      {result.feedback && <p className="mt-1.5 text-muted-foreground">{result.feedback}</p>}
    </div>
  );
}

/**
 * The client half of the graph's `human_approval` interrupt. `addResult` is
 * what releases the paused run — see `unstable_humanToolNames` in assistant.tsx.
 *
 * `display: "standalone"` keeps it out of the collapsible tool group the thread
 * puts ordinary tool calls in; buttons behind a disclosure trigger would strand
 * the graph.
 */
export const WeftApprovalToolUI = makeAssistantToolUI<ApprovalArgs, ApprovalResult>({
  toolName: APPROVAL_TOOL_NAME,
  display: "standalone",
  render: function WeftApproval({ args, result, addResult }) {
    const [reason, setReason] = useState("");

    if (result) return <Settled result={result} />;

    const { stage, requirements, testCases } = args;
    const copy = STAGE_COPY[stage];
    const items =
      stage === "extract_requirements"
        ? requirements.map((r) => ({
            id: r.id,
            title: r.title,
            body: r.acceptance_criteria.map((c) => `• ${c.text}`).join("\n"),
          }))
        : testCases.map((tc) => ({ id: tc.id, title: tc.title, body: tc.gherkin }));

    return (
      <div className="my-2 space-y-3 rounded-lg border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="text-xs text-muted-foreground">
            {copy.gate} · {items.length} to review
          </p>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <DraftItem key={item.id} {...item} />
          ))}
        </div>

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What should change? (required to send back)"
          className="min-h-16 text-sm"
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!reason.trim()}
            onClick={() => addResult({ approved: false, feedback: reason.trim() })}
          >
            Send back
          </Button>
          <Button size="sm" onClick={() => addResult({ approved: true })}>
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      </div>
    );
  },
});
