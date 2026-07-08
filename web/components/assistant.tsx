"use client";

import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { fastapiAdapter } from "@/lib/chat-adapter";
import { Thread } from "@/components/thread";

export function Assistant() {
  const runtime = useLocalRuntime(fastapiAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
