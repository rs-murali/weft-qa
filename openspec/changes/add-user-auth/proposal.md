## Why

weft-qa currently has no authentication — any user can access the chat and agent endpoints. Adding email/password auth with JWT tokens secures the assistant behind a login gate, enabling controlled access and laying the groundwork for per-user context.

## What Changes

- New `POST /auth/register` endpoint to create a user (email + hashed password stored in MongoDB)
- New `POST /auth/login` endpoint that validates credentials and returns a signed JWT
- `POST /chat/stream` is protected — requests without a valid JWT are rejected with 401
- New Next.js login page (`/login`) built with shadcn/ui components
- Unauthenticated users are redirected to `/login`; successful login redirects to the chat

## Capabilities

### New Capabilities

- `user-auth`: Email/password registration and login, JWT issuance and verification, MongoDB user storage, and frontend login page with route protection

### Modified Capabilities

- `chat`: `/chat/stream` now requires a valid JWT `Authorization: Bearer <token>` header

## Impact

- **Backend**: New `api/app/routers/auth.py` router; new `User` MongoDB model; new `AuthService`; JWT middleware/dependency added to the chat router; `motor` (async MongoDB driver) and `PyJWT` or `python-jose` added as dependencies
- **Frontend**: New `/login` page using shadcn/ui `Input`, `Button`, `Card`, `Form` components; auth token stored in `localStorage` or a cookie; `chat-adapter.ts` updated to attach `Authorization` header
- **Infrastructure**: MongoDB connection string required in `api/.env` (`MONGODB_URI`, `MONGODB_DB_NAME`); new env vars `JWT_SECRET`, `JWT_EXPIRE_MINUTES`
- **Agents**: Neither `test_gen` nor `coverage_sync` agent logic changes — only the HTTP layer is gated

## Non-goals

- OAuth / social login (Google, GitHub, etc.)
- Role-based access control or permissions
- Password reset / forgot-password flow
- Email verification on registration
- Refresh tokens (single short-lived access token only for now)
