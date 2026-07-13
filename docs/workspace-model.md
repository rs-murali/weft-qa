# Workspace Model

Companion to `mvp/weft-mvp-prd-v0.2.md` — that doc defines the pipeline, gates, coverage, and change-tracking rules; this one covers the workspace container itself, what is canonical vs. derived inside it, and the knowledge surface (Memory, Instructions, Files) that stacks on after MVP. Written up for review, not yet implemented.

## Workspace

A Workspace is a single-user container per feature/product area (e.g. "Checkout flow revamp"), reached via login → home dashboard. It holds:

- **Requirements table** — the canonical, structured table (single source of truth)
- **Test cases** — linked to requirements and acceptance criteria
- **Chats** — multiple conversation threads, all reading/writing the same workspace state
- **Files** — uploaded input documents, retained for provenance (and RAG, post-MVP)
- **Memory** — auto-summarized workspace context *(post-MVP)*
- **Instructions** — custom steering for this workspace *(post-MVP)*

Nothing here is scoped to an individual chat. A chat is a conversation thread *inside* a workspace, not a container of its own — two different chats in the same workspace see the same requirements, the same files, the same state.

## One input, one pipeline

There are no separate "document" and "chat" modes. A single chat box (with a pin icon for attachments) takes either a typed feature description or an attached document — both feed the identical pipeline:

```
input → extract → Gate 1 (approve requirements) → generate tests → Gate 2 (approve tests) → coverage → export
```

Each requirement records `origin: chat | document`, but that is provenance metadata only — extraction, gates, test generation, coverage, and change tracking treat every requirement identically. An uploaded document is just a bigger input: it dissolves into requirement proposals at extraction and is kept in Files for reference.

## Requirement lifecycle

Every requirement lives a two-phase life, and this lifecycle — not any document — is the backbone of the workspace:

```
proposed (draft) ──approve──► approved (canonical) ──approved change proposal──► modified / removed
```

- **Draft** — what extraction produces; shown as an artifact, refined in conversation (the system asks clarifying questions, the user adds/edits criteria). Invisible to everything downstream.
- **Approved** — written to the canonical table at Gate 1. Approval is batch with per-item edit/reject. Canonical `req_key`s are assigned here, at approval time — draft keys are provisional, so concurrent chats holding pending drafts can't collide.
- **Changed** — an approved requirement changes only through an approved change proposal (see below). Its `req_key` never changes.

**Every Gate-1 approval creates a version snapshot** of the requirement set. That snapshot is the unit of audit and diffing — there is no "confirmed spec document" and no document-level version. The approval is the version event.

## Requirements table

A requirement is one atomic, testable statement of behavior (e.g. "Guest checkout allowed without creating an account") with a stable `req_key` and acceptance criteria.

**Why a structured table, when the input prose says the same thing:** prose can't be computed against. The table is what makes three things possible:

1. **Coverage math** — `covered / total` needs discrete, checkable units; a paragraph isn't one.
2. **Change tracking** — diffing atomic requirements catches a real behavior change buried in an unchanged-looking paragraph, and avoids flagging a reworded-but-unchanged one. A raw text diff of two documents can't do this reliably.
3. **Test case linkage** — a test case has to point at *something specific* to get a per-criterion coverage breakdown (`REQ-002: 1/2 covered`) instead of a binary yes/no against "the spec."

## Test cases & coverage

Test cases are generated per approved requirement (Gherkin), pass through Gate 2, and link to their `req_key` and specific acceptance criterion. **The requirement ↔ test-case link is the load-bearing structure of the whole system** — coverage is computed from it, and change tracking walks it.

Coverage is a deterministic rule computed at read time (see `mvp/weft-mvp-prd-v0.2.md` FR-7): **Covered** / **Partial** / **Missing**, where flagged (`needs_review` / `orphaned`) test cases don't count as covering — so a modified requirement's coverage visibly degrades until its tests are re-approved.

## Change tracking (incremental change proposals)

Changes arrive the same way requirements do — through the chat box. New input is semantically matched against the existing table and the AI proposes a classification: *"this looks like it modifies REQ-001 — approve?"* The user approves or overrides at Gate 1. Once approved, the consequences run mechanically (see `mvp/weft-mvp-prd-v0.2.md` FR-8):

- **New** → generate test cases
- **Modified** → linked test cases marked `needs_review`
- **Removed** → linked test cases marked `orphaned`; the requirement is tombstoned (archived, not erased)
- **Unchanged** → no action, no version entry

Flags are resolved through gated paths — regenerate / edit / confirm for `needs_review`, re-link / archive / delete for `orphaned` (see `mvp/weft-mvp-prd-v0.2.md` FR-10).

Because keys are never re-derived — an existing requirement receives an approved modification under its own `req_key` — there is no post-hoc ID-matching problem. Re-uploading a full new document version is just the batch case: a set of add/modify/remove proposals reviewed at Gate 1 together.

This is what `agents/coverage_sync/` is for — currently a stub in the codebase.

## Export

The workspace's outputs are renders of canonical state, never separately authored documents: a requirements document (render of the table, with version history) and the approved test-case suite, both as markdown. Together they are the handoff package the user feeds to an AI coding tool to generate test automation code — Weft owns spec → test design; coding tools own test design → test code.

## Post-MVP knowledge surface

These appear in the UI mockups and stack on after the MVP core; none are load-bearing for the pipeline above.

### Memory

An auto-generated, editable running summary of what's been established in the workspace — key facts and decisions pulled from requirements and chat history (e.g. "checkout supports 3 payment methods; refunds must complete within 5 business days"). Workspace-scoped, not per-chat.

Distinct from the requirements table: Memory is informal narrative context that grounds the assistant's responses; the table is the formal, structured index that coverage and diffing run against. Memory answers "what do we know"; the table answers "what's been checked."

### Instructions

Workspace-level steering for how the assistant behaves *in this workspace specifically* — e.g. "write test cases in Gherkin," "flag accessibility edge cases," "our severity scale is P0–P3." Persists across all chats in the workspace; different workspaces can have different instructions.

### Files & RAG

Uploaded documents, versioned. Beyond their MVP role (provenance for extraction), they power retrieval grounding for chat responses, with a capacity indicator showing how much of the workspace's knowledge base is in use. This is what `api/app/rag/` is for — currently a stub.

## Open questions

Tracked in `mvp/weft-mvp-prd-v0.2.md` §10 — the ones that shape this model most: matching logic for change proposals (Q1), blast radius of "modified" (Q3), and whether gates live inline in chat or in a dedicated review panel (Q4).
