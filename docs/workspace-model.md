# Workspace Model

Companion to `weft-mvp-draft.md` — that doc defines the requirements/coverage/change-tracking rules; this one covers the workspace container, the two entry points into it, and the knowledge-management surface (Memory, Instructions, Files) shown in the UI mockups. Written up for review, not yet implemented.

## Workspace

A Workspace is a single-user container per feature/product area (e.g. "Checkout flow revamp"). It holds:

- **Requirements** — the canonical, structured list (see below)
- **Test cases** — linked to requirements
- **Files** — uploaded spec documents, versioned
- **Chats** — multiple chat sessions, all reading/writing the same workspace state
- **Memory** — auto-summarized workspace context
- **Instructions** — custom steering for this workspace

Nothing here is scoped to an individual chat. A chat is a conversation thread *inside* a workspace, not a container of its own — two different chats in the same workspace see the same requirements, the same memory, the same files.

## Two modes: how a spec comes to exist

Both converge on the same requirements table. The only difference is how the source spec document gets created.

**Draft mode (default)** — user has no document yet, just a feature idea. They describe it conversationally; the AI drafts a structured feature-spec; user reviews and confirms it. Chat is required here — nothing exists to extract from until the conversation produces a confirmed spec.

**Upload mode** — user already has a written PRD. They upload it directly. No drafting conversation needed; extraction runs straight off the file. Chat still matters after extraction (discussing ambiguous requirements, asking for more test cases, digging into "needs review" flags) — it's just not needed to *create* the spec.

Either way, the output is the same shape: a confirmed, versioned spec document that requirement extraction runs against.

## Requirements list

A requirement is one atomic, testable statement of behavior (e.g. "Guest checkout allowed without creating an account"), extracted from a confirmed spec version, with a stable ID (`REQ-001`, `REQ-002`, ...).

**Why a separate structured list, when the spec already says the same thing in prose:** prose can't be computed against. The requirements list is what makes three things possible:

1. **Coverage math** — `covered / total` needs discrete, checkable units; a paragraph isn't one.
2. **Version diffing** — comparing atomic requirements catches a real behavior change buried in an unchanged-looking paragraph, and avoids flagging a reworded-but-unchanged one. A raw text diff of two spec versions can't do this reliably.
3. **Test case linkage** — a test case has to point at *something specific* to get a per-item coverage breakdown (`REQ-002: 1/2 covered`) instead of a binary yes/no against "the spec."

**Extraction cadence** — this is the part that keeps the list honest rather than arbitrary: extraction runs **once per confirmed spec version**, against fixed text, never against the raw in-progress conversation. In Draft mode that trigger is the user's confirmation step; in Upload mode it's the upload itself. Re-extraction only happens when a *new* version is confirmed/uploaded — that's also the trigger for change tracking (next section).

**Origin tag** — not every requirement comes from a spec document. A requirement stated directly in chat and confirmed there (`origin: chat`) is still added to the same list, since it's real and testable — it just has no spec text to diff against later, so it needs to be visually distinguishable in the UI (e.g. a "manual" badge) since re-sync can't track changes to it the way it can for `origin: prd` requirements.

## Test cases & coverage

Test cases are generated per requirement and linked by requirement ID. Coverage status is a deterministic rule, not LLM judgment (see `weft-mvp-draft.md` §4): **Covered** / **Partial** / **Missing** based on whether every acceptance criterion has a linked test case.

## Change tracking (re-sync)

When a new spec version is confirmed/uploaded, extraction runs again and produces a new set of requirement IDs. Diff against the previous version by ID (see `weft-mvp-draft.md` §5):

- ID only in new → new requirement → generate test cases
- ID only in old → removed → linked test cases marked **orphaned**
- ID in both, content changed → linked test cases marked **needs review**

This is what `agents/coverage_sync/` is for — currently a stub in the codebase.

## Memory

An auto-generated, editable running summary of what's been established in the workspace — key facts and decisions pulled from the spec and chat history (e.g. "checkout supports 3 payment methods; refunds must complete within 5 business days"). Workspace-scoped, not per-chat.

Distinct from the requirements list: Memory is informal narrative context that grounds the assistant's responses; the requirements list is the formal, structured index that coverage and diffing run against. Memory answers "what do we know"; the requirements list answers "what's been checked."

## Instructions

Workspace-level steering for how the assistant behaves *in this workspace specifically* — e.g. "write test cases in Gherkin," "flag accessibility edge cases," "our severity scale is P0–P3." Persists across all chats in the workspace; different workspaces can have different instructions.

## Files & RAG

Uploaded documents (PRDs, and potentially other spec-adjacent docs), versioned. Power two things: retrieval grounding for chat responses, and the input to requirement extraction. A capacity indicator shows how much of the workspace's knowledge base is in use. This is what `api/app/rag/` is for — currently a stub.

## Open questions

Not yet decided — flagging so review can settle them before implementation:

- **New-vs-existing matching** — when a chat states a requirement, how does the system decide "this is REQ-002" vs. "this is new"? Presumably semantic similarity search against the existing list before creating an entry, but the matching/confidence logic isn't designed yet.
- **Confirmation mechanics in Draft mode** — is confirming a drafted spec a single explicit action, or a multi-turn negotiation where the user edits pieces before confirming?
- **Confidence/review threshold** — `weft-mvp-draft.md` §7 calls for a confidence score with a `needs_review` cutoff; the actual threshold and where it's surfaced in this UI isn't defined yet.
