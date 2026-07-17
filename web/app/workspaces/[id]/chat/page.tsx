"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { WeftRuntimeProvider } from "@/components/assistant";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Workspace } from "@/lib/api";
import type { PipelinePanel } from "@/lib/placeholder-workspace-data";
import { ChatExperience } from "@/components/workspace/chat-experience";

const VALID_PANELS: PipelinePanel[] = ["requirements", "testcases", "coverage", "files", "history"];

export default function WorkspaceChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notFound, setNotFound] = useState(false);

  const panelParam = searchParams.get("panel") as PipelinePanel | null;
  const initialPanel =
    panelParam && VALID_PANELS.includes(panelParam) ? panelParam : "requirements";
  const title = searchParams.get("title") ?? "New chat";

  useEffect(() => {
    let cancelled = false;
    api
      .getWorkspace(params.id)
      .then((ws) => {
        if (!cancelled) setWorkspace(ws);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const threadParam = searchParams.get("thread");

  if (notFound) {
    return (
      <main className="flex min-h-dvh flex-col bg-background text-foreground">
        <AppHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-semibold">Workspace not found</p>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!workspace) {
    return (
      <main className="flex min-h-dvh flex-col bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <WeftRuntimeProvider workspaceId={params.id} threadId={threadParam}>
      <ChatExperience workspace={workspace} initialPanel={initialPanel} title={title} />
    </WeftRuntimeProvider>
  );
}
