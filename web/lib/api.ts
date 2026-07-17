import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export type Severity = "warning" | "danger";

export type WorkspaceStats = {
  requirement_count: number;
  test_case_count: number;
  needs_review_count: number;
  orphaned_count: number;
  coverage_pct: number | null;
};

export type Workspace = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  stats: WorkspaceStats;
};

export type NeedsAttentionItem = {
  workspace_id: string;
  workspace_name: string;
  message: string;
  severity: Severity;
};

export type ChatThread = {
  thread_id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export const api = {
  listWorkspaces: () => request<Workspace[]>("/workspaces"),
  getWorkspace: (id: string) => request<Workspace>(`/workspaces/${id}`),
  createWorkspace: (body: { name: string; description: string }) =>
    request<Workspace>("/workspaces", { method: "POST", body: JSON.stringify(body) }),
  updateWorkspace: (id: string, body: { name: string; description: string }) =>
    request<Workspace>(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteWorkspace: (id: string) => request<void>(`/workspaces/${id}`, { method: "DELETE" }),
  listThreads: (workspaceId: string) => request<ChatThread[]>(`/workspaces/${workspaceId}/threads`),
};
