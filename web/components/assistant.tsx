"use client";

import { type ReactNode, useMemo, useRef } from "react";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { APPROVAL_TOOL_NAME, createFastapiAdapter } from "@/lib/chat-adapter";
import { WeftApprovalToolUI } from "@/components/workspace/weft-approval-tool-ui";

/*Hosts the chat runtime for a workspace. Mounted above both the overview
composer and the chat experience so the thread survives the in-place morph
from overview to chat.*/
function WeftRuntimeContent({
  workspaceId,
  initialThreadId,
  children,
}: {
  workspaceId: string;
  initialThreadId: string | null;
  children: ReactNode;
}) {
  const threadIdRef = useRef<string | null>(initialThreadId);
  const adapter = useMemo(() => createFastapiAdapter(workspaceId, threadIdRef), [workspaceId]);
  const runtime = useLocalRuntime(adapter, {
    /*Parks the run on an approval tool call until the UI answers with
    addResult, which is what re-invokes the adapter to resume the graph.
    The run is gated on the reviewer either way, so there is no step cap:
    maxSteps counts adapter-reported metadata.steps, which this one has
    no reason to emit.*/
    unstable_humanToolNames: [APPROVAL_TOOL_NAME],
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <WeftApprovalToolUI />
      {children}
    </AssistantRuntimeProvider>
  );
}

/*Hosts the chat runtime for a workspace. Mounted above both the overview
composer and the chat experience so the thread survives the in-place morph
from overview to chat.
Uses a keyed content wrapper so changing the workspaceId or threadId resets the runtime state.*/
export function WeftRuntimeProvider({
  workspaceId,
  threadId,
  children,
}: {
  workspaceId: string;
  threadId?: string | null;
  children: ReactNode;
}) {
  return (
    <WeftRuntimeContent
      key={threadId ?? workspaceId}
      workspaceId={workspaceId}
      initialThreadId={threadId ?? null}
    >
      {children}
    </WeftRuntimeContent>
  );
}
