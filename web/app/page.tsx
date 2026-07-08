"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { StatCards } from "@/components/dashboard/stat-cards";
import { NeedsAttentionPanel } from "@/components/dashboard/needs-attention-panel";
import { WorkspaceGrid } from "@/components/dashboard/workspace-grid";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Workspace } from "@/lib/api";
import { deriveDashboardSummary } from "@/lib/dashboard-summary";

export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .listWorkspaces()
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]));
  }, []);

  const filtered = useMemo(() => {
    if (!workspaces) return [];
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (ws) => ws.name.toLowerCase().includes(q) || ws.description.toLowerCase().includes(q),
    );
  }, [workspaces, search]);

  const summary = useMemo(() => deriveDashboardSummary(workspaces ?? []), [workspaces]);
  const loading = workspaces === null;

  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <AppHeader />
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-7 px-4 py-8">
        <div>
          <p className="text-xl font-semibold text-black">Welcome back</p>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s how test coverage looks across your workspaces
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <StatCards summary={summary} />
        )}

        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <NeedsAttentionPanel items={summary.needs_attention} />
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black">Workspaces</h2>
            <p className="text-sm text-gray-500">Pick a workspace or start a new one</p>
          </div>
          <CreateWorkspaceDialog />
        </div>

        <Input
          placeholder="Search workspaces..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <WorkspaceGrid workspaces={filtered} />
        )}
      </div>
    </main>
  );
}
