# Weft — MVP Spec (Draft)

**Tagline:** Catch where the weave breaks.

---

## Problem
QA has no fast answer to two questions: is this requirement actually tested, and did coverage break when the spec changed. Right now both require manual digging — true whether the spec exists as a formal PRD or is still being worked out in conversation.

## User
QA Engineer / SDET. One persona for v1.

## Core concept: Project
A Project is a single-user workspace per feature/product area — not multi-team scope (still cut, see below). It holds:
- Requirements (current state + full version history)
- Test cases (linked to requirements)
- Coverage matrix
- Source documents (if any were uploaded)
- Rendered PRD (current + past versions)

The Project exists because the diff engine needs a container to know "this is v2 of the same thing" — it's infrastructure the system already required, not new feature scope.

## Core features

**1. Two entry points, one requirements table**
- **Document flow** — upload a PRD → requirements extracted as structured units (`req_key` + acceptance criteria) → land in the project's `requirements` table.
- **Chat flow** — describe a requirement directly in chat, no doc needed → same extraction logic runs on the message → lands in the same table.

Either way, everything downstream (test generation, coverage, diffing) treats the requirement identically. The entry point only changes how the row gets created.

**2. Clarifying questions for chat-derived requirements**
If a chat-described requirement is missing acceptance criteria or is ambiguous, the system asks follow-up questions before finalizing it — not a single-shot guess. Document-derived requirements don't get this treatment (no conversational partner to ask); they go straight to confidence scoring.

**3. Test Case Generation**
Test cases generated per requirement, EARS/Gherkin format, regardless of entry point.

**4. Coverage Matrix**
Deterministic rule, never LLM judgment:
- **Covered** — every acceptance criterion has ≥1 linked test case
- **Partial** — some criteria unmapped
- **Missing** — zero test cases linked

**5. Change Tracking (unified)**
Any change to the requirement set — a new PRD version uploaded, or a requirement added/edited via chat — creates a new version snapshot. Diff by `req_key` against the previous snapshot, deterministic:
- Key only in new → **Expanded** → generate test cases
- Key only in old → **Removed** → linked test cases marked `orphaned`
- Key in both, content differs past threshold → **Modified** → linked test cases marked `needs_review`

LLM explains the change; it never classifies it.

**6. PRD Export**
The PRD isn't separately authored — it's a rendered view of the current requirement set, available at any time, with version history. This is why chat-only projects still produce a real PRD: it's just a render of whatever requirements exist, regardless of how they got there.

**7. Confidence + Review Loop**
Every generated requirement/test case carries a confidence score. Below threshold → `needs_review`, never silently finalized. User can accept/edit/reject anything the system produces.

## Out of scope (v1)
Bug similarity search, duplicate detection, multi-project **team** support (this Project is single-user, not collaborative), integrations (Jira/Slack), QA-lead/PM/developer views.

## Stack
Next.js + React (UI) · FastAPI (backend) · LangGraph (single graph) · PostgreSQL (relational truth) · Qdrant (semantic retrieval only)

## Build order
This got longer than the original three-feature MVP — sequence matters more now, not less:

1. Requirements table + document extraction + test generation — one entry point, no chat yet
2. Coverage matrix on top of that
3. PRD export (trivial once 1 exists — it's a render)
4. Change tracking / diff engine, still document-only at this stage
5. Chat entry point, basic version — accept the chat-described requirement as typed, no follow-up questions yet, reuse the same extraction pipeline
6. Clarifying-question dialogue for chat — build last, it's the highest-risk piece (multi-turn slot-filling, deciding when "enough" information exists)
7. Confidence scoring + review loop — thread through all six above, don't bolt on at the end

Steps 5 and 6 are split deliberately. Get the chat entry point working on the simple path before adding the harder conversational refinement on top of it.
