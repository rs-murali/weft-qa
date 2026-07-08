"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Assistant } from "@/components/assistant";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Workspace } from "@/lib/api";

export default function WorkspaceDetailPage() {
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
      <main className="flex min-h-dvh flex-col bg-white">
        <AppHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-semibold text-black">Workspace not found</p>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 underline-offset-2 hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!workspace) {
    return (
      <main className="flex min-h-dvh flex-col bg-white">
        <AppHeader />
        <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-white">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <div className="w-72 shrink-0 overflow-y-auto border-r border-gray-100 p-4">
          <h1 className="text-base font-semibold text-black">{workspace.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{workspace.description}</p>

          <div className="mt-6 space-y-3">
            <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400">
              No requirements yet — upload a spec or start a conversation.
            </div>
            <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400">
              No coverage data yet.
            </div>
            <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400">
              Nothing needs attention yet.
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <Assistant />
        </div>
      </div>
    </main>
  );
}
