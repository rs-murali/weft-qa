# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**weft-qa** is an AI-powered QA assistant that generates test cases from requirements, builds a coverage matrix, and re-syncs when specs change. It is a monorepo with two workspaces:

- `api/` — Python/FastAPI backend with LangGraph agents
- `web/` — Next.js/React frontend with assistant-ui chat

## Commands

### API (run from `api/`)

```bash
# Start dev server (port 9000)
uv run uvicorn main:app --port 9000 --reload

# Run tests
uv run pytest

# Run a single test file
uv run pytest tests/unit/test_foo.py

# Run a single test by name
uv run pytest tests/unit/test_foo.py::test_bar
```

Requires `OPENROUTER_API_KEY` in `api/.env`.

### Web (run from `web/`)

```bash
npm run dev        # Start dev server (port 3000, Turbopack)
npm run lint       # oxlint + oxfmt check
npm run lint:fix   # Auto-fix lint and format
npm run format:fix # oxfmt format only
npm run build
```

Set `NEXT_PUBLIC_API_URL=http://localhost:9000` in `web/.env.local` if the API is not on port 9000.

## Architecture

### Request Flow

```
Browser → assistant-ui (Thread component)
       → fastapiAdapter (web/lib/chat-adapter.ts)  [plain SSE fetch]
       → POST /chat/stream  (FastAPI, port 9000)
       → TestGenAgent.astream()  [LangGraph graph]
       → LLM (OpenRouter via langchain-openrouter)
       ← token stream (text/plain)
       ← accumulated text yielded per chunk
```

Note: `web/app/api/[..._path]/route.ts` is a leftover LangGraph proxy route — it is not used. The active backend connection is `web/lib/chat-adapter.ts` pointing directly at FastAPI.

### Backend DI Container (`api/app/core/container.py`)

`dependency-injector` wires the entire object graph as singletons:

```
Container
  ├── llm                  → ChatOpenRouter instance
  ├── test_gen_system_prompt → loaded from agents/test_gen/prompts/test_gen_system.md
  ├── test_gen_nodes       → Nodes(llm, system_prompt)
  └── test_gen_agent       → TestGenAgent(nodes)
```

`container.wire(modules=["app.routers.chat"])` enables `@inject` + `Depends(Provide[Container.test_gen_agent])` in the router. The container is attached to `app.container` in `main.py`.

### LangGraph Agents (`api/app/agents/`)

Each agent follows this structure:
```
agents/<name>/
  agent.py          # StateGraph definition — builds and compiles the graph
  prompts/          # System prompt .md files (loaded at startup via prompt_loader)
  utils/
    state.py        # TypedDict state extending MessagesState
    nodes.py        # Async node functions injected with llm + system_prompt
```

`TestGenAgent` currently has one node (`generate`) and passes the full message history to the LLM. The system prompt injection in `Nodes.generate` is stubbed out (see comment in `nodes.py`).

### Frontend Components

`web/app/assistant.tsx` is the runtime entry point — it creates a `useLocalRuntime(fastapiAdapter)` and wraps everything in `AssistantRuntimeProvider`. The `Thread` component (`web/components/thread.tsx`) renders the full chat UI from `@assistant-ui/react`.

UI components in `web/components/ui/` are Radix UI primitives; `web/lib/utils.ts` provides the `cn()` helper for `clsx` + `tailwind-merge`.

### Adding a New Agent

1. Create `api/app/agents/<name>/` with the structure above.
2. Register singletons in `Container` (llm, prompt, nodes, agent).
3. Add a router if a new endpoint is needed; wire it in `main.py`.
4. Prompts are `.md` files — `load_prompt()` reads them as plain text at startup.

## Conventions

**Commit messages:**
- Conventional commits with scope, e.g. `feat(api): ...`, `fix(web): ...`
- No Co-Authored-By trailers

**Frontend UI:**
- Use shadcn/ui components exclusively for all UI elements. Do not introduce other component libraries.
