"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { APPROVAL_TOOL_NAME, createFastapiAdapter } from "@/lib/chat-adapter";
import { Thread } from "@/components/thread";
import { WeftApprovalToolUI } from "@/components/workspace/weft-approval-tool-ui";

export function Assistant({ workspaceId }: { workspaceId: string }) {
  const adapter = useMemo(
    () => createFastapiAdapter(workspaceId),
    [workspaceId],
  );
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
      <Thread />
    </AssistantRuntimeProvider>
  );
}
