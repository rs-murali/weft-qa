## Context

weft-qa exposes a streaming chat endpoint (`POST /chat/stream`) with no access control. Any client can call it. This design adds email/password authentication backed by MongoDB, issues JWTs on login, and gates the chat endpoint behind token verification.

The backend uses FastAPI with a `dependency-injector` DI container. The frontend is Next.js with shadcn/ui components.

## Goals / Non-Goals

**Goals:**
- `POST /auth/register` — create a user, store bcrypt-hashed password in MongoDB
- `POST /auth/login` — verify credentials, return a signed JWT
- `POST /chat/stream` — require a valid JWT; return 401 otherwise
- Next.js `/login` page using shadcn/ui; unauthenticated users redirected there
- JWT attached to all API requests via `Authorization: Bearer` header

**Non-Goals:**
- OAuth / social login
- Refresh tokens
- Role-based access control
- Password reset or email verification

## Decisions

### 1. MongoDB driver: `motor` (async)

FastAPI is fully async; using `motor` (async wrapper around `pymongo`) keeps the event loop non-blocking. Alternative: `pymongo` with `run_in_executor` — rejected as boilerplate-heavy.

### 2. JWT library: `python-jose[cryptography]`

Standard choice in the FastAPI ecosystem with JOSE spec compliance. Alternative: `PyJWT` — lighter but less commonly used with FastAPI tutorials; `python-jose` has broader algorithm support if we ever need RS256.

### 3. Password hashing: `passlib[bcrypt]`

bcrypt is the standard for password storage. `passlib` provides a clean API and handles salt generation. Alternative: `argon2-cffi` — stronger but adds a native dependency with more complex build requirements.

### 4. Auth as a FastAPI dependency (not middleware)

JWT verification is implemented as a `get_current_user` FastAPI dependency injected per-route, not as ASGI middleware. This gives granular control (some routes public, some protected) without touching the middleware stack. The chat router adds `Depends(get_current_user)` to its endpoint.

### 5. Token stored in `localStorage` on the frontend

Simple approach for this stage. Cookie-based HttpOnly storage would be more secure against XSS but requires CSRF handling. `localStorage` is acceptable here given no sensitive data beyond the token itself is stored client-side.

### 6. shadcn/ui for the login page

Project convention (see CLAUDE.md). Login page uses `Card`, `CardContent`, `CardHeader`, `Form`, `FormField`, `Input`, `Button` from shadcn/ui. No custom Radix primitives added directly.

## Data Model

```
users collection (MongoDB)
{
  _id: ObjectId,
  email: string (unique index),
  hashed_password: string,
  created_at: datetime
}
```

## API Contract

```
POST /auth/register
Body: { "email": string, "password": string }
201:  { "message": "User created" }
409:  { "detail": "Email already registered" }
422:  validation error

POST /auth/login
Body: { "email": string, "password": string }
200:  { "access_token": string, "token_type": "bearer" }
401:  { "detail": "Invalid credentials" }

POST /chat/stream  (existing, now protected)
Header: Authorization: Bearer <token>
401:  { "detail": "Not authenticated" }  (missing/invalid token)
```

## Sequence Diagrams

### Registration
```
Client              FastAPI /auth/register     MongoDB
  |                        |                      |
  |-- POST /auth/register ->|                      |
  |                        |-- find_one(email) --->|
  |                        |<-- null --------------|
  |                        |-- hash password       |
  |                        |-- insert_one -------->|
  |                        |<-- ok ----------------|
  |<-- 201 ----------------|                      |
```

### Login + Chat
```
Client          FastAPI /auth/login    MongoDB    FastAPI /chat/stream
  |                    |                  |              |
  |-- POST /login ----->|                  |              |
  |                    |-- find_one ------>|              |
  |                    |<-- user doc ------|              |
  |                    |-- verify bcrypt   |              |
  |                    |-- sign JWT        |              |
  |<-- { access_token }|                  |              |
  |                                                      |
  |-- POST /chat/stream (Authorization: Bearer <token>) ->|
  |                                        |-- decode JWT |
  |                                        |-- 200 stream |
  |<-- SSE token stream ----------------------------------------|
```

## New Files

```
api/
  app/
    core/
      security.py          # JWT encode/decode, get_current_user dependency
      mongodb.py           # Motor client singleton, get_db() dependency
    models/
      user.py              # UserInDB, UserCreate, TokenResponse Pydantic models
    routers/
      auth.py              # /auth/register + /auth/login
  pyproject.toml           # add motor, python-jose[cryptography], passlib[bcrypt]

web/
  app/
    login/
      page.tsx             # shadcn/ui login form (server component shell)
  components/
    login-form.tsx         # "use client" form with react-hook-form + shadcn/ui
  lib/
    auth.ts                # getToken(), setToken(), clearToken() helpers
  middleware.ts            # Next.js middleware to redirect /login if token present
```

## Environment Variables

```
# api/.env additions
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=weft_qa
JWT_SECRET=<random 32-byte hex>
JWT_EXPIRE_MINUTES=60
```

## Risks / Trade-offs

- **`localStorage` XSS exposure** → Mitigation: acceptable for current threat model; upgrade to HttpOnly cookie in a future iteration
- **No token revocation** → Mitigation: short expiry (60 min); add a blocklist if needed later
- **MongoDB not running locally** → Mitigation: document `docker run -p 27017:27017 mongo` in README; connection error surfaces at startup
- **`motor` adds async complexity** → Mitigation: wrap in a single `get_db()` dependency; all DB calls confined to `AuthService`

## Open Questions

- Should `JWT_EXPIRE_MINUTES` be configurable per environment (shorter in prod)?
- Do we want the register endpoint to be publicly accessible post-MVP, or should it be admin-only?
