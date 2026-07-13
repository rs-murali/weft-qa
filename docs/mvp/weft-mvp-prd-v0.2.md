# Weft — MVP Product Requirements Document

**Tagline:** Catch where the weave breaks.

## Document Control

| Field | Value |
|---|---|
| Version | v0.2 (Draft) |
| Status | In review |
| Owner | Murali |
| Last updated | 2026-07-10 |
| Related docs | `../workspace-model.md` (workspace container & knowledge surface) · `../ui/weft_workspace_mockup.html` (UI mockups) |

### Revision history

| Version | Date | Changes |
|---|---|---|
| v0.1 | 2026-07-10 | Restructured draft into PRD format. Renamed "Project" → "Workspace". Stack updated to MongoDB (Beanie ODM). |
| v0.2 | 2026-07-10 | Reworked around a single input pipeline with two human approval gates. Collapsed document/chat flows into one unified input. Change tracking redefined as incremental change proposals (resolves former Q1). Export reframed as a deliverables handoff to AI coding tools. Confidence scoring deferred out of MVP. App shell (auth, home, workspace CRUD) added to scope. Review pass: added FR-10 (flag resolution & remediation) and FR-11 (version history), rejection and `req_key`-assignment semantics, "unchanged" classification, tombstones for removed requirements, input format/error handling, scale assumptions. |

---

## 1. Overview

Weft turns feature descriptions into an approved requirements table, generates linked test cases, computes a coverage matrix, and keeps all of it in sync when requirements change.

All input arrives through **one chat box** — typed text or an attached document, it makes no difference. Every AI output passes a **human approval gate** before becoming canonical. The end deliverable is an **exportable package** (requirements + test cases in markdown) that the user hands to an AI coding tool (Cursor, Claude Code, etc.) to generate the actual test automation code. Weft owns *spec → test design*; coding tools own *test design → test code*.

### The pipeline

```
INPUT ──────────► EXTRACT ────► GATE 1 ─────────► GENERATE ───► GATE 2 ────► COVERAGE ───► EXPORT
one chat box      LLM proposes  human approves    LLM writes    human        computed      markdown
(text or 📎       requirements  → canonical       test cases    approves     from links    handoff
attached doc)     as a draft    requirements      linked to     → canonical  at read       package
                  artifact      table             req + AC      test cases   time
```

Change tracking re-enters this same pipeline: a later input that matches an existing requirement becomes a *change proposal* at Gate 1 (see FR-8).

## 2. Problem Statement

QA has no fast answer to two questions:

1. **Is this requirement actually tested?**
2. **Did coverage break when the spec changed?**

Today both require manual digging — true whether the spec exists as a formal PRD or is still being worked out in conversation. Coverage claims are anecdotal, and spec revisions silently invalidate test suites. And even once test cases exist, getting them into a form an automation engineer (or AI coding tool) can execute against is another manual translation step.

## 3. Goals

| # | Goal | Signal of success |
|---|---|---|
| G1 | Every requirement in a workspace has a computed, per-criterion coverage status | Coverage matrix renders for 100% of approved requirements |
| G2 | A requirement change never silently invalidates coverage | Every removed/modified requirement leaves its test cases flagged (`orphaned` / `needs_review`), never unflagged |
| G3 | Requirements can enter the system without a document existing | A typed feature description lands in the same table with identical downstream behavior |
| G4 | Nothing AI-generated becomes canonical without explicit human approval | Every requirement and test case passed through a gate; zero silent writes |
| G5 | The output is directly usable | User can export requirements + test suite as markdown and feed them to an AI coding tool without reformatting |

### Non-goals (v1)

- **Test automation code generation** — deliberately delegated to AI coding tools via export (G5)
- **Confidence scoring** — deferred; the approval gates already guarantee G4 structurally. Returns later as a review-prioritization aid, not a safety mechanism
- **Memory, Instructions, Files/RAG** — the knowledge surface stacks on after MVP (see `../workspace-model.md`)
- Bug similarity search and duplicate detection
- Multi-user / team collaboration (a Workspace is single-user)
- Integrations (Jira, Slack)
- Role-specific views (QA-lead, PM, developer)

## 4. Target User

**QA Engineer / SDET.** One persona for v1. Works on a feature/product area, owns its test suite, and needs to know coverage state at any moment — especially right after a spec change. Their end-to-end workflow with Weft: approve requirements → approve test cases → export → generate automation code with their own AI tooling.

## 5. Core Concepts

### Workspace

A Workspace is a single-user container per feature/product area, reached via login → home dashboard → workspace. It holds:

- **Requirements table** — the canonical, structured table: current state + full version history
- **Test cases** — linked to requirements and acceptance criteria
- **Coverage matrix** — computed, never stored
- **Chats** — conversation threads inside the workspace, all reading/writing the same state
- **Files** — uploaded input documents, retained for provenance
- **Exports** — rendered views of the table and test suite (never separately authored)

**Design decision — requirements are canonical.** The requirements table is the single source of truth. An uploaded document is an *input* that proposes changes to the table; an exported document is a *render* of it. No document is ever the master copy.

### Requirement lifecycle

Every requirement lives a two-phase life:

```
proposed (draft) ──approve──► approved (canonical) ──approved change proposal──► modified / removed
```

- Nothing downstream (test generation, coverage, export) ever sees a `draft`.
- An `approved` requirement changes only through an approved change proposal (FR-8).
- **Every Gate-1 approval creates a version snapshot** of the requirement set — the unit of audit and diffing. There is no separate "document version"; the approval *is* the version event.

**Design decision — manual edits are not special.** The user may edit canonical state directly (reword an approved requirement, delete a test case), but a direct edit is simply a user-authored, self-approved change proposal: it creates a version snapshot and runs the same deterministic consequences as any approved proposal (FR-8). Even a manual edit can therefore never silently invalidate coverage. There is no side door around the pipeline — gates and self-approved edits are the only two ways canonical state changes, and both leave the same audit trail.

## 6. Functional Requirements

### FR-1 — App shell

Email/password signup and login → **Home** (dashboard listing the user's workspaces, create/open) → **Workspace**. Accounts are self-registered; "single-user" means no sharing, roles, or collaboration — each account sees only its own workspaces.

### FR-2 — Unified input

One chat box with attachment support (pin icon). The user either types a feature description or attaches a document (PRD, feature doc). Both go through the identical pipeline. Each resulting requirement records `origin: chat | document` — provenance metadata only, with **zero** downstream behavioral difference.

Supported attachment formats in v1: `.md`, `.txt`, `.pdf`, `.docx`. If extraction finds no requirements (empty, unparseable, or off-topic input), the system says so in chat and creates nothing — there is no empty draft artifact.

### FR-3 — Requirement extraction

The LLM extracts structured requirements from the input: one atomic testable statement plus acceptance criteria (`AC1…ACn`) per requirement. The result is presented as a **draft requirements artifact** — status `draft`, not yet canonical. Draft requirements carry provisional keys only; canonical `req_key`s are assigned at Gate-1 approval (FR-4).

### FR-4 — Gate 1: review & approve requirements

The draft artifact is refined conversationally before approval, in both directions:

- The **system asks** clarifying questions when a requirement is ambiguous or missing acceptance criteria — never a single-shot guess.
- The **user edits** through chat ("also lock the account after 5 failed attempts" → the draft updates in place) or directly.

Approval is **batch with per-item control**: approve the whole artifact at once, after editing or rejecting individual requirements. On approval, the requirements are written to the canonical table and a version snapshot is created.

Mechanics that keep this safe:

- **Key assignment** — canonical `req_key`s are assigned sequentially *at approval time*. Draft keys are provisional, so two chats holding pending draft artifacts can never collide on a key (NFR-2).
- **Draft persistence** — pending draft artifacts are workspace-scoped and survive leaving the chat; they stay pending until approved or rejected.
- **Rejection** — a rejected item never reaches the canonical table, but the rejected proposal is retained in the audit trail (FR-11), not silently discarded.

### FR-5 — Test case generation

For approved requirements only, the LLM generates test cases in Gherkin format as a **draft test-case artifact**. Each test case has a stable `tc_key` (e.g. `TC-001`, assigned at Gate-2 approval), a title, the Gherkin scenario, and links to its `req_key` **and** the specific acceptance criterion it covers. This link is the load-bearing structure of the whole system.

Generation can also be **scoped**: from the coverage matrix, the user can request test cases for a specific requirement's unmapped criteria only (see FR-10) — the same generation path, restricted to the gap.

### FR-6 — Gate 2: review & approve test cases

Same loop as Gate 1: the user requests changes, edits, or rejects individual test cases, then approves. Approved test cases become canonical and their links are locked in. Rejected test cases are retained in the audit trail only, like rejected requirements (FR-4).

### FR-7 — Coverage matrix

Coverage status is a deterministic rule, never LLM judgment:

| Status | Rule |
|---|---|
| **Covered** | Every acceptance criterion has ≥ 1 approved, unflagged linked test case |
| **Partial** | Some criteria unmapped, **or** some linked test cases are flagged `needs_review` / `orphaned` |
| **Missing** | Zero test cases linked |

Flagged test cases do not count as covering — a modified requirement's coverage degrades until its tests are re-reviewed and re-approved. Coverage is computed from requirement ↔ test-case links at read time; it is never stored as an independent fact that can drift.

### FR-8 — Change tracking (incremental change proposals)

Requirement changes arrive the same way requirements do: through the chat box. New input is semantically matched against the existing table, and the AI proposes a classification — *"this looks like it modifies REQ-001 — approve?"* The user approves or overrides ("no, it's new") at Gate 1. Once approved, the consequences are deterministic:

| Approved proposal | Action |
|---|---|
| **New** requirement | Generate test cases (FR-5) |
| **Modified** requirement | Linked test cases marked `needs_review` |
| **Removed** requirement | Linked test cases marked `orphaned`; requirement tombstoned |
| **Unchanged** (matched, content equivalent) | No action — not a proposal, produces no version entry |

The **unchanged** classification is what keeps the batch case usable: re-uploading a v2 document where 30 of 40 requirements are identical must yield ~10 proposals, not 40. A **removed** requirement is tombstoned, not erased — it stays visible in the table as archived, holding its orphaned test cases until they are resolved (FR-10), and remains in every historical snapshot.

The LLM *proposes the match* and *explains the change*; it never sets the resulting status — the transitions above run mechanically once the proposal is approved. `req_key` stability is by construction: keys are never re-derived, an existing requirement receives an approved modification under its own key.

Re-uploading a full new document version is the batch case: extraction against the current table produces a set of change proposals (adds / modifies / removes), reviewed at Gate 1 like any other.

**Worked example.** Workspace has `REQ-001` (email/password login, 5 ACs) with 3 approved test cases; coverage **Covered**. PM says *"email login should support OTP instead of password."* AI proposes: *modifies REQ-001*. User approves → version snapshot → all 3 linked test cases become `needs_review` → coverage drops to **Partial** until QA updates and re-approves them. PM later says *"remove Google login"* → AI proposes: *removes REQ-002* → user approves → REQ-002's test cases become `orphaned`.

### FR-9 — Export (the deliverables handoff)

At any time the user can export, as markdown:

- **Requirements document** — a render of the current canonical table (with version history available)
- **Test-case suite** — the approved Gherkin test cases, organized per requirement with their links

Together these are the handoff package for AI coding tools to generate test automation code. Nothing exported is separately authored — every export is a render of canonical state, so a chat-only workspace still produces a complete, real PRD.

### FR-10 — Flag resolution & coverage remediation

Flags are the product's alarm; this FR is how the user turns the alarm off — every path runs through a gate, and coverage recomputes the moment a flag clears.

**`needs_review` test cases** (requirement was modified) — per test case, the user can:

| Action | Mechanics |
|---|---|
| **Regenerate** | LLM re-derives the test case against the new requirement text → Gate 2 |
| **Edit** | User updates it manually → re-approve at Gate 2 |
| **Confirm still valid** | Re-approve as-is (e.g. the account-lock test survives the OTP change untouched) |

**`orphaned` test cases** (requirement was removed) — per test case, the user can:

| Action | Mechanics |
|---|---|
| **Re-link** | Point it at a different requirement/criterion → re-approve at Gate 2 |
| **Archive** | Keep it for reference; excluded from coverage |
| **Delete** | Remove it (retained in audit trail, FR-11) |

**Coverage gaps** (Partial with unmapped criteria) — from the coverage matrix, the user triggers scoped generation for the unmapped criteria only (FR-5) → Gate 2.

### FR-11 — Version history

The audit surface behind NFR-3. Each workspace exposes its full snapshot history: every version of the requirement set, the change proposal that produced it (what was added / modified / removed, its origin, when, and the LLM's explanation of the change), and rejected proposals. Any historical snapshot can be inspected; the requirements document export (FR-9) can be rendered from any snapshot, not just the current one.

## 7. Non-Functional Requirements

| # | Requirement |
|---|---|
| NFR-1 | Coverage status and change consequences are deterministic and reproducible — LLM output proposes and explains, never decides status. |
| NFR-2 | Single-user scope; no concurrent-editor conflict resolution in v1 (concurrent chats in one workspace must not corrupt state). |
| NFR-3 | Full auditability: every version snapshot and every applied change proposal is retained and inspectable. |
| NFR-4 | No silent writes: every mutation of canonical state passes through a human approval gate (or is a self-approved user edit — see §5). |
| NFR-5 | MVP scale assumption: a workspace's requirements table fits in a single LLM context (order of ≤ 200 requirements); uploaded documents up to ~100 pages. Beyond that is post-MVP (see Retrieval row, §8). |

## 8. Technical Stack

| Layer | Choice |
|---|---|
| UI | Next.js + React (assistant-ui chat, artifact panel) |
| Backend | FastAPI |
| Auth | Email/password session auth (single-user MVP) |
| Agents | LangGraph (single graph) |
| Persistence | MongoDB via Beanie ODM (canonical state) |
| Retrieval | *Post-MVP.* No vector store in MVP — change-proposal matching runs with the full requirements table in the LLM context. A vector store enters later for RAG over Files and as a matching pre-filter once tables outgrow the context window; retrieval grounds discussion only, never canonical truth |

## 9. Milestones / Build Order

The order walks the pipeline left to right; each milestone is independently demoable.

| # | Milestone | Notes |
|---|---|---|
| M1 | App shell: auth + home dashboard + workspace CRUD | Partially built already |
| M2 | Unified input → extraction → Gate 1 | The requirements ledger — the heart of the system |
| M3 | Test generation → Gate 2 | Artifact + feedback loop |
| M4 | Coverage matrix | Pure computation over links from M2/M3; includes gap remediation (FR-10, coverage-gap path) |
| M5 | Export + version history view | Trivial once M2–M3 exist — both are renders of canonical state (FR-9, FR-11) |
| M6 | Change tracking / diff engine | The differentiator, built last on a working core; includes flag resolution (FR-10, `needs_review`/`orphaned` paths) |

Post-MVP stack (in rough order): confidence scoring as review prioritization, Memory, Instructions, Files/RAG, multi-chat polish.

## 10. Open Questions

| # | Question | Blocking |
|---|---|---|
| Q1 | **Matching logic for change proposals** — how the AI decides "new" vs. "modifies REQ-x" (semantic similarity against the table? cutoffs?). User override always exists, but the proposal quality determines UX. | M6 |
| Q2 | **Reworded vs. modified on full-document re-upload** — batch extraction of a v2 document may produce spurious "modified" proposals for requirements that were merely reworded. What keeps that noise down? | M6 |
| Q3 | **Blast radius of "modified"** — v1 flags *all* test cases on a modified requirement. AC-level flagging (only tests linked to changed criteria) is the refinement — when? | M6 |
| Q4 | **Gate surface** — are artifacts reviewed/approved inline in chat, or in a dedicated review panel? Affects M2 UI design. | M2 |

*(Former Q4, orphaned test-case resolution, is resolved by FR-10.)*

## 11. Glossary

| Term | Meaning |
|---|---|
| **Workspace** | Single-user container per feature/product area; unit of versioning and diffing |
| **Requirement** | One atomic, testable statement of behavior with a stable `req_key` and acceptance criteria |
| **`req_key`** | Stable identifier of a requirement (e.g. `REQ-002`); assigned at Gate-1 approval, never re-derived |
| **`tc_key`** | Stable identifier of a test case (e.g. `TC-001`); assigned at Gate-2 approval |
| **Artifact** | A draft AI output (requirements or test cases) awaiting a gate; never canonical |
| **Gate** | A human approval step; the only way canonical state changes |
| **Change proposal** | An AI-proposed add/modify/remove against the existing table, resolved at Gate 1 |
| **Version snapshot** | The state of the requirement set recorded at each Gate-1 approval; the audit/diff unit |
| **Coverage** | Computed per-requirement status (Covered / Partial / Missing) derived from criterion↔test-case links |
| **`orphaned`** | Test case whose requirement was removed; resolved by re-link / archive / delete (FR-10) |
| **Tombstone** | A removed requirement kept visible as archived — holding its orphaned tests and its place in history — rather than erased |
| **`needs_review`** | Test case whose requirement was modified; resolved by regenerate / edit / confirm-valid (FR-10) |
| **Deliverables** | The exported markdown package (requirements doc + test suite) handed to AI coding tools |
