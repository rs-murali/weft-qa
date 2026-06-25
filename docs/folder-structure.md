# Project Folder Structure

## Overview

```
weft-qa/
├── web/                          # assistant-ui (Next.js)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── chat/
│   │           └── route.ts
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   └── MessageList.tsx
│   │   └── coverage/
│   │       ├── CoverageMatrix.tsx
│   │       └── TestCaseCard.tsx
│   ├── lib/
│   │   └── assistant.ts
│   ├── public/
│   ├── .env.local
│   └── package.json
│
├── api/                          # FastAPI + LangGraph (uv)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── dependencies.py
│   │   ├── config.py
│   │   │
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py
│   │   │   ├── requirements.py
│   │   │   └── coverage.py
│   │   │
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── test_gen/
│   │   │   │   ├── graph.py
│   │   │   │   ├── nodes.py
│   │   │   │   └── state.py
│   │   │   └── coverage_sync/
│   │   │       ├── graph.py
│   │   │       ├── nodes.py
│   │   │       └── state.py
│   │   │
│   │   ├── rag/
│   │   │   ├── __init__.py
│   │   │   ├── ingestion.py
│   │   │   ├── retriever.py
│   │   │   └── store.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── requirement.py
│   │   │   ├── test_case.py
│   │   │   └── coverage.py
│   │   │
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── requirement_parser.py
│   │       └── coverage_builder.py
│   │
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── .env
│   └── Dockerfile
│
├── docs/
│   └── folder-structure.md
├── .env.example
├── docker-compose.yml
└── README.md
```

## Module Responsibilities

### `web/`
| Path | Purpose |
|---|---|
| `app/api/chat/route.ts` | Next.js route handler — proxies streaming to FastAPI |
| `components/chat/` | assistant-ui chat primitives |
| `components/coverage/` | Coverage matrix and test case display |
| `lib/assistant.ts` | assistant-ui runtime config and thread management |

### `api/`
| Path | Purpose |
|---|---|
| `main.py` | FastAPI app entry point, router mounts |
| `dependencies.py` | Shared FastAPI deps (vector store, auth) |
| `config.py` | App settings via pydantic-settings + uv env |
| `routers/chat.py` | `/chat/stream` — invokes LangGraph agent |
| `routers/requirements.py` | PRD upload and re-sync trigger |
| `routers/coverage.py` | Coverage matrix CRUD |
| `agents/test_gen/` | LangGraph graph: requirements → test cases |
| `agents/coverage_sync/` | LangGraph graph: PRD diff → coverage re-sync |
| `rag/` | Shared ingestion, retriever, and vector store client |
| `models/` | Pydantic request/response schemas |
| `services/` | Pure business logic, no FastAPI dependencies |
