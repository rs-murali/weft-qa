"use client";

import type { ChatModelAdapter } from "@assistant-ui/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

export const APPROVAL_TOOL_NAME = "weft_approval";

export type WeftStage = "extract_requirements" | "generate_test_cases";

export type WeftRequirement = {
  id: string;
  title: string;
  statement: string;
  acceptance_criteria: { text: string }[];
};

export type WeftTestCase = {
  id: string;
  title: string;
  gherkin: string;
  requirement_id: string;
  criterion_index: number;
};

export type ApprovalArgs = {
  stage: WeftStage;
  requirements: WeftRequirement[];
  testCases: WeftTestCase[];
};

/** What the approval UI hands back via `addResult`. */
export type ApprovalResult = { approved: boolean; feedback?: string };

export type ThreadIdRef = { current: string | null };

/** One NDJSON line off `/chat/stream` — mirrors `event_line()` on the backend. */
type StreamEvent =
  | { type: "thread_id"; thread_id: string }
  | { type: "requirements"; requirements: WeftRequirement[] }
  | { type: "test_cases"; test_cases: WeftTestCase[] }
  | { type: "interrupt"; stage: WeftStage }
  | { type: "done" }
  | { type: "error"; message: string; stage: WeftStage | null };

function isPendingApprovalCall(
  part: unknown,
): part is { type: "tool-call"; toolName: string; result?: ApprovalResult } {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as { type?: unknown }).type === "tool-call" &&
    (part as { toolName?: unknown }).toolName === APPROVAL_TOOL_NAME
  );
}

export function createFastapiAdapter(
  workspaceId: string,
  threadIdRef: ThreadIdRef,
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal, unstable_getMessage }) {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("weft_access_token") : null;

      // A resolved approval tool-call is always the last content part of the
      // in-progress message — see `unstable_humanToolNames` in assistant.tsx.
      // Its presence is what tells this call apart from a fresh run: the
      // wire vocabulary the router expects (`approval_status`) only makes
      // sense as an answer to a gate the graph is already paused on.
      const lastPart = unstable_getMessage().content.at(-1);
      const pendingApproval =
        isPendingApprovalCall(lastPart) && lastPart.result !== undefined ? lastPart.result : null;

      const response = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          thread_id: threadIdRef.current,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
              .filter((c): c is typeof c & { type: "text"; text: string } => c.type === "text")
              .map((c) => ({ type: "text", text: c.text })),
          })),
          ...(pendingApproval
            ? {
                approval_status: pendingApproval.approved ? "approved" : "rejected",
                feedback: pendingApproval.feedback,
              }
            : {}),
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let requirements: WeftRequirement[] = [];
      let testCases: WeftTestCase[] = [];

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (!line.trim()) continue;

          const event = JSON.parse(line) as StreamEvent;
          switch (event.type) {
            case "thread_id":
              threadIdRef.current = event.thread_id;
              break;
            case "requirements":
              requirements = event.requirements;
              break;
            case "test_cases":
              testCases = event.test_cases;
              break;
            case "interrupt": {
              const args: ApprovalArgs = {
                stage: event.stage,
                requirements,
                testCases,
              };
              yield {
                content: [
                  {
                    type: "tool-call",
                    toolCallId: crypto.randomUUID(),
                    toolName: APPROVAL_TOOL_NAME,
                    args,
                    argsText: JSON.stringify(args),
                  },
                ],
                status: { type: "requires-action", reason: "tool-calls" },
              };
              break;
            }
            case "done":
              break;
            case "error":
              throw new Error(event.message);
          }
        }
      }
    },
  };
}
