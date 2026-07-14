"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, CheckSquare, ChevronLeft, FileText, FlaskConical, History } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Assistant } from "@/components/assistant";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { api, type Workspace } from "@/lib/api";
import { getPipelineMockData, type PipelinePanel } from "@/lib/placeholder-workspace-data";
import { BreadcrumbNav } from "@/components/workspace/breadcrumb-nav";
import { ExportDialog } from "@/components/workspace/export-dialog";
import { PipelineRail } from "@/components/workspace/pipeline-rail";
import { ArtifactEmptyState } from "@/components/workspace/artifact-empty-state";
import { RequirementsDraftPanel } from "@/components/workspace/requirements-draft-panel";
import { TestCasesDraftPanel } from "@/components/workspace/test-cases-draft-panel";
import { CoveragePanel } from "@/components/workspace/coverage-panel";
import { FilesList } from "@/components/workspace/files-list";
import { VersionHistoryTimeline } from "@/components/workspace/version-history-timeline";
import { PanelHeader } from "@/components/workspace/panel-header";

const VALID_PANELS: PipelinePanel[] = ["requirements", "testcases", "coverage", "files", "history"];

export default function WorkspaceChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const initialPanel = (searchParams.get("panel") as PipelinePanel | null) ?? "requirements";
  const [panel, setPanel] = useState<PipelinePanel>(
    VALID_PANELS.includes(initialPanel) ? initialPanel : "requirements",
  );
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

  const mock = getPipelineMockData(workspace);

  function updatePanel(next: string) {
    setPanel(next as PipelinePanel);
    setPanelOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("panel", next);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }

  function openPanel() {
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  return (
    <main className="flex h-dvh flex-col bg-background text-foreground">
      <AppHeader
        breadcrumb={
          <BreadcrumbNav
            backHref={`/workspaces/${workspace.id}`}
            backLabel={workspace.name}
            current={title}
          />
        }
        actions={
          <ExportDialog
            requirementsMarkdown={
              mock.exportPreview.requirementsMarkdown || "No content to export yet."
            }
            testSuiteMarkdown={mock.exportPreview.testSuiteMarkdown || "No content to export yet."}
            fileNamePrefix={workspace.name.toLowerCase().replace(/\s+/g, "-")}
          />
        }
      />

      <Tabs
        value={panel}
        onValueChange={updatePanel}
        orientation="vertical"
        className="min-h-0 flex-1 flex-row gap-0"
      >
        <PipelineRail
          counts={{
            requirements: mock.requirementsDraft.filter((r) => r.state === "pending").length,
            testCases: mock.testCasesDraft.filter((tc) => tc.state === "pending").length,
          }}
        />

        <div className="relative flex min-h-0 flex-1">
          {!panelOpen && (
            <button
              type="button"
              onClick={openPanel}
              aria-label="Open panel"
              className="absolute top-1/2 right-0 z-10 flex h-16 w-4 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="min-h-0 min-w-0 flex-1">
            <Assistant />
          </div>

          <div
            className={cn(
              "h-full shrink-0 overflow-hidden border-l bg-card transition-[width] duration-200 ease-in-out",
              panelOpen ? "w-1/2" : "w-0 border-l-0",
            )}
          >
            <div className="h-full w-full">
              <TabsContent value="requirements" className="h-full">
                {mock.requirementsDraft.length > 0 ? (
                  <RequirementsDraftPanel
                    requirements={mock.requirementsDraft}
                    onClose={closePanel}
                  />
                ) : (
                  <ArtifactEmptyState
                    icon={CheckSquare}
                    message="Waiting on the first draft — this fills in as soon as extraction finishes."
                    onClose={closePanel}
                  />
                )}
              </TabsContent>

              <TabsContent value="testcases" className="h-full">
                {mock.testCasesDraft.length > 0 ? (
                  <TestCasesDraftPanel testCases={mock.testCasesDraft} onClose={closePanel} />
                ) : (
                  <ArtifactEmptyState
                    icon={FlaskConical}
                    message="Test cases appear here once requirements are approved at Gate 1."
                    onClose={closePanel}
                  />
                )}
              </TabsContent>

              <TabsContent value="coverage" className="h-full">
                {mock.coverage.length > 0 ? (
                  <CoveragePanel rows={mock.coverage} onClose={closePanel} />
                ) : (
                  <ArtifactEmptyState
                    icon={BarChart3}
                    message="No approved requirements yet — coverage has nothing to measure against."
                    onClose={closePanel}
                  />
                )}
              </TabsContent>

              <TabsContent value="files" className="h-full">
                {mock.files.length > 0 ? (
                  <div className="flex h-full flex-col">
                    <PanelHeader
                      title="Files"
                      subtitle={`${mock.files.length} attached`}
                      onClose={closePanel}
                    />
                    <div className="flex-1 overflow-y-auto p-4">
                      <FilesList files={mock.files} />
                    </div>
                  </div>
                ) : (
                  <ArtifactEmptyState
                    icon={FileText}
                    message="Nothing uploaded yet — attach a document from the composer."
                    onClose={closePanel}
                  />
                )}
              </TabsContent>

              <TabsContent value="history" className="h-full">
                {mock.history.length > 0 ? (
                  <div className="flex h-full flex-col">
                    <PanelHeader
                      title="Version history"
                      subtitle={`${mock.history.length} versions`}
                      onClose={closePanel}
                    />
                    <div className="flex-1 overflow-y-auto p-4">
                      <VersionHistoryTimeline entries={mock.history} />
                    </div>
                  </div>
                ) : (
                  <ArtifactEmptyState
                    icon={History}
                    message="No versions yet — your first Gate 1 approval creates Version 1."
                    onClose={closePanel}
                  />
                )}
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
    </main>
  );
}
