// Placeholder data for workspace screens that have no backing API yet
// (requirements, test cases, coverage, files, version history). The AI
// pipeline agent that produces this data for real hasn't been built —
// this module is the single seam to swap out once it has. Nothing outside
// the two page-level orchestrators (workspaces/[id]/page.tsx and
// workspaces/[id]/chat/page.tsx) should import this module directly.

import type { Workspace } from "@/lib/api";
import type { WeaveStatus } from "@/components/workspace/weave-threads";

export type PipelinePanel = "requirements" | "testcases" | "coverage" | "files" | "history";

export type RequirementSummaryRow = {
  key: string;
  title: string;
  acSummary: string;
  threads: WeaveStatus[];
};

export type NeedsAttentionEntry = {
  severity: "warning" | "danger";
  message: string;
  panel: PipelinePanel;
};

export type RecentChatEntry = {
  id: string;
  title: string;
  when: string;
};

export type FileEntry = {
  id: string;
  name: string;
  uploadedAt: string;
  origin: "doc" | "chat";
};

export type VersionEntry = {
  version: number | "rejected";
  date: string;
  origin?: "document" | "chat";
  diff?: { added: number; modified: number; removed: number };
  explanation: string;
  rejected?: boolean;
};

export type DraftRequirement = {
  key: string;
  title: string;
  acSummary: string;
  state: "pending" | "approved" | "rejected";
  rejectReason?: string;
};

export type DraftTestCase = {
  key: string;
  title: string;
  gherkin: string;
  requirementKey: string;
  requirementTitle: string;
  state: "pending" | "approved" | "rejected";
};

export type CoverageThread = {
  status: WeaveStatus;
  label: string;
  remediation?: "needs_review" | "orphaned";
};

export type CoverageRow = {
  key: string;
  title: string;
  tombstoned?: boolean;
  threads: CoverageThread[];
  pill: "Covered" | "Partial" | "Missing" | "Removed";
};

export type OverviewMockData = {
  stat: {
    coveragePct: number;
    requirementCount: number;
    needsReviewCount: number;
    orphanedCount: number;
  } | null;
  recentChats: RecentChatEntry[];
  requirements: RequirementSummaryRow[];
  needsAttention: NeedsAttentionEntry[];
  files: FileEntry[];
  versionSummary: { count: number; lastApprovedDate: string } | null;
};

export type PipelineMockData = {
  requirementsDraft: DraftRequirement[];
  testCasesDraft: DraftTestCase[];
  coverage: CoverageRow[];
  files: FileEntry[];
  history: VersionEntry[];
  exportPreview: { requirementsMarkdown: string; testSuiteMarkdown: string };
};

/** Stable pseudo-random split so a given workspace always renders the same
 * demo variant. TODO(core-agent): replace with `workspace.stats.requirement_count > 0`
 * once the backend actually computes stats. */
export function hashWorkspaceId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function isPopulatedMock(workspace: Workspace): boolean {
  return hashWorkspaceId(workspace.id) % 2 === 0;
}

export function mockThreadsForCard(workspace: Workspace): WeaveStatus[] {
  if (!isPopulatedMock(workspace)) return [];
  return ["covered", "covered", "needs_review", "covered", "missing"];
}

const EMPTY_OVERVIEW: OverviewMockData = {
  stat: null,
  recentChats: [],
  requirements: [],
  needsAttention: [],
  files: [],
  versionSummary: null,
};

const POPULATED_OVERVIEW: OverviewMockData = {
  stat: { coveragePct: 78, requirementCount: 12, needsReviewCount: 2, orphanedCount: 1 },
  recentChats: [
    { id: "c1", title: "Login requirement + clarifying questions", when: "2h ago" },
    { id: "c2", title: "Payment validation edge cases", when: "Yesterday" },
    { id: "c3", title: "Cart abandonment coverage gaps", when: "3 days ago" },
  ],
  requirements: [
    {
      key: "REQ-001",
      title: "Email/password login",
      acSummary: "AC1–AC3",
      threads: ["covered", "covered", "needs_review"],
    },
    {
      key: "REQ-002",
      title: "Account lockout after 5 attempts",
      acSummary: "AC1–AC3",
      threads: ["covered", "covered", "covered"],
    },
    { key: "REQ-004", title: "OTP resend after 60s", acSummary: "unmapped", threads: ["missing"] },
  ],
  needsAttention: [
    {
      severity: "warning",
      message: "2 test cases need review — REQ-001 changed to support OTP",
      panel: "coverage",
    },
    { severity: "danger", message: "1 test case orphaned — REQ-008 removed", panel: "coverage" },
  ],
  files: [
    { id: "f1", name: "checkout-spec.pdf", uploadedAt: "Jul 10", origin: "doc" },
    { id: "f2", name: "checkout-spec-v2.pdf", uploadedAt: "Jul 12", origin: "doc" },
  ],
  versionSummary: { count: 3, lastApprovedDate: "Jul 12" },
};

const EMPTY_PIPELINE: PipelineMockData = {
  requirementsDraft: [],
  testCasesDraft: [],
  coverage: [],
  files: [],
  history: [],
  exportPreview: { requirementsMarkdown: "", testSuiteMarkdown: "" },
};

const POPULATED_PIPELINE: PipelineMockData = {
  requirementsDraft: [
    {
      key: "REQ-001",
      title: "User can log in with email + password",
      acSummary:
        "AC1 valid credentials · AC2 invalid shows error · AC3 5 failed attempts locks account",
      state: "pending",
    },
    {
      key: "REQ-002",
      title: "Account locks after 5 failed login attempts",
      acSummary: "AC1 locks for 15 minutes (updated from chat) · AC2 shows countdown",
      state: "pending",
    },
    {
      key: "REQ-003",
      title: "Guest checkout skips account creation",
      acSummary: "rejected — out of scope for this cycle",
      state: "rejected",
    },
  ],
  testCasesDraft: [
    {
      key: "TC-001",
      title: "Valid credentials log the user in",
      requirementKey: "REQ-001",
      requirementTitle: "Email/password login",
      gherkin:
        "Given a registered user\nWhen they submit valid email and password\nThen they land on the account dashboard",
      state: "pending",
    },
    {
      key: "TC-004",
      title: "5th failed attempt locks the account for 15 minutes",
      requirementKey: "REQ-002",
      requirementTitle: "Account lockout",
      gherkin:
        "Given 4 prior failed login attempts\nWhen the 5th attempt also fails\nThen the account locks and a 15-minute countdown is shown",
      state: "pending",
    },
  ],
  coverage: [
    {
      key: "REQ-001",
      title: "Email/password login",
      pill: "Partial",
      threads: [
        { status: "covered", label: "AC1 — covered" },
        { status: "covered", label: "AC2 — covered" },
        { status: "needs_review", label: "AC3", remediation: "needs_review" },
      ],
    },
    {
      key: "REQ-002",
      title: "Account lockout",
      pill: "Covered",
      threads: [
        { status: "covered", label: "AC1 — covered" },
        { status: "covered", label: "AC2 — covered" },
      ],
    },
    {
      key: "REQ-004",
      title: "OTP resend after 60s",
      pill: "Missing",
      threads: [{ status: "missing", label: "unmapped" }],
    },
    {
      key: "REQ-008",
      title: "Google login (removed)",
      tombstoned: true,
      pill: "Removed",
      threads: [{ status: "orphaned", label: "TC-011", remediation: "orphaned" }],
    },
  ],
  files: [
    { id: "f1", name: "checkout-spec.pdf", uploadedAt: "Jul 10", origin: "doc" },
    { id: "f2", name: "checkout-spec-v2.pdf", uploadedAt: "Jul 12", origin: "doc" },
  ],
  history: [
    {
      version: 3,
      date: "Jul 12",
      origin: "document",
      diff: { added: 0, modified: 1, removed: 1 },
      explanation:
        "Email login now supports OTP instead of password (REQ-001 modified); Google login removed (REQ-008).",
    },
    {
      version: 2,
      date: "Jul 11",
      origin: "chat",
      diff: { added: 1, modified: 0, removed: 0 },
      explanation: "Added OTP resend requirement from chat.",
    },
    {
      version: 1,
      date: "Jul 10",
      origin: "document",
      diff: { added: 2, modified: 0, removed: 0 },
      explanation: "Initial extraction from checkout-spec.pdf.",
    },
    {
      version: "rejected",
      date: "Jul 10",
      explanation: "Guest checkout skips account creation — rejected, out of scope.",
      rejected: true,
    },
  ],
  exportPreview: {
    requirementsMarkdown:
      "# Checkout flow revamp — Requirements (v3)\n\n## REQ-001 — Email/password login with OTP\n- AC1: valid OTP code logs the user in\n- AC2: invalid OTP shows an error\n...",
    testSuiteMarkdown:
      "# Checkout flow revamp — Test suite (v3)\n\n## REQ-001\n### TC-001 — Valid credentials log the user in\n```gherkin\nGiven a registered user\nWhen they submit valid email and password\nThen they land on the account dashboard\n```\n...",
  },
};

export function getOverviewMockData(workspace: Workspace): OverviewMockData {
  return isPopulatedMock(workspace) ? POPULATED_OVERVIEW : EMPTY_OVERVIEW;
}

export function getPipelineMockData(workspace: Workspace): PipelineMockData {
  return isPopulatedMock(workspace) ? POPULATED_PIPELINE : EMPTY_PIPELINE;
}
