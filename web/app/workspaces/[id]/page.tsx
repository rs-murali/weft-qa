"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { ComposerPrimitive, useAuiState } from "@assistant-ui/react";
import { AppHeader } from "@/components/app-header";
import { WeftRuntimeProvider } from "@/components/assistant";
import { ComposerAddAttachment, ComposerAttachments } from "@/components/attachment";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api, type Workspace, type ChatThread } from "@/lib/api";
import { getOverviewMockData } from "@/lib/placeholder-workspace-data";
import { BreadcrumbNav } from "@/components/workspace/breadcrumb-nav";
import { ChatExperience } from "@/components/workspace/chat-experience";
import { ExportDialog } from "@/components/workspace/export-dialog";
import { StatLine } from "@/components/workspace/stat-line";
import { RecentChatsList } from "@/components/workspace/recent-chats-list";
import { NeedsAttentionList } from "@/components/workspace/needs-attention-list";
import { WeaveThreads, WeaveLegend } from "@/components/workspace/weave-threads";
import { cn } from "@/lib/utils";

export default function WorkspaceOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notFound, setNotFound] = useState(false);

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
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <WeftRuntimeProvider workspaceId={params.id}>
      <OverviewOrChat workspace={workspace} />
    </WeftRuntimeProvider>
  );
}

/*The overview composer is the real chat composer: the first send morphs
this page into the chat experience in place, so the message is never lost
to a navigation. The URL is updated shallowly so refresh and sharing land
on the chat route; the runtime lives in the provider above and survives
the swap.*/
function OverviewOrChat({ workspace }: { workspace: Workspace }) {
  const chatStarted = useAuiState((s) => s.thread.messages.length > 0);

  useEffect(() => {
    if (chatStarted) {
      window.history.pushState(null, "", `/workspaces/${workspace.id}/chat`);
    }
  }, [chatStarted, workspace.id]);

  if (chatStarted) {
    return <ChatExperience workspace={workspace} />;
  }
  return <OverviewContent workspace={workspace} />;
}

function OverviewContent({ workspace }: { workspace: Workspace }) {
  const mock = getOverviewMockData(workspace);
  const isEmpty = mock.stat === null;
  const [threads, setThreads] = useState<ChatThread[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .listThreads(workspace.id)
      .then((ts) => {
        if (!cancelled) setThreads(ts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workspace.id]);

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppHeader
        breadcrumb={<BreadcrumbNav backHref="/" backLabel="Workspaces" current={workspace.name} />}
        actions={
          <ExportDialog
            requirementsMarkdown="No content to export yet."
            testSuiteMarkdown="No content to export yet."
            fileNamePrefix={workspace.name.toLowerCase().replace(/\s+/g, "-")}
          />
        }
      />

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        <div>
          <h1 className="text-xl font-semibold">{workspace.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.description ||
              "Add a description so teammates know what this workspace covers"}
          </p>
        </div>

        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            No activity yet — describe a requirement or attach a document below to get started.
          </p>
        ) : (
          <StatLine stat={mock.stat!} />
        )}

        {mock.needsAttention.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Needs attention
            </p>
            <NeedsAttentionList workspaceId={workspace.id} items={mock.needsAttention} />
          </div>
        )}

        <ComposerPrimitive.Root
          className={cn(
            "flex flex-col gap-2 rounded-3xl border bg-muted/30 p-2",
            isEmpty && "border-primary",
          )}
        >
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder="Describe a requirement or ask a question..."
            autoFocus={isEmpty}
            rows={1}
            aria-label="Message input"
            className="max-h-40 min-h-9 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none placeholder:text-muted-foreground/80"
          />
          <div className="flex items-center justify-between">
            <ComposerAddAttachment />
            <ComposerPrimitive.Send asChild>
              <Button size="icon" aria-label="Send message" className="size-7 rounded-full">
                <ArrowUp className="size-4.5" />
              </Button>
            </ComposerPrimitive.Send>
          </div>
        </ComposerPrimitive.Root>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Requirements {mock.requirements.length > 0 && `(${mock.requirements.length})`}
            </p>
            {mock.requirements.length > 0 && <WeaveLegend className="text-[11px]" />}
          </div>
          {mock.requirements.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Key</th>
                    <th className="px-3 py-2 text-left font-medium">Title</th>
                    <th className="px-3 py-2 text-left font-medium">AC</th>
                    <th className="px-3 py-2 text-right font-medium">Weave</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mock.requirements.map((req) => (
                    <tr key={req.key} className="hover:bg-accent/50">
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {req.key}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{req.title}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                        {req.acSummary}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <WeaveThreads threads={req.threads} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No requirements yet — describe a feature above or attach a spec to extract some.
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Recent chats</p>
          {threads.length > 0 ? (
            <RecentChatsList workspaceId={workspace.id} chats={threads} />
          ) : (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No chats yet — your first message above starts one.
            </p>
          )}
        </div>

        {/* Files and version history — left for a future pass */}
        {/* <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Files {mock.files.length > 0 && `(${mock.files.length})`}
                </CardTitle>
                <Button variant="ghost" size="icon-sm" aria-label="Upload file">
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                {mock.files.length > 0 ? (
                  <FilesList files={mock.files} />
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Nothing uploaded yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Version history
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mock.versionSummary ? (
                  <VersionHistorySummaryCard
                    workspaceId={workspace.id}
                    count={mock.versionSummary.count}
                    lastApprovedDate={mock.versionSummary.lastApprovedDate}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No versions yet — your first Gate 1 approval creates Version 1.
                  </p>
                )}
              </CardContent>
            </Card>
          </div> */}
      </div>
    </main>
  );
}
