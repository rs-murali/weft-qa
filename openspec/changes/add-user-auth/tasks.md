## 1. Backend — Dependencies & Config

- [x] 1.1 Add `motor`, `python-jose[cryptography]`, and `passlib[bcrypt]` to `api/pyproject.toml` and install
- [x] 1.2 Add `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, and `JWT_EXPIRE_MINUTES` to `api/app/core/config.py` (pydantic-settings)
- [x] 1.3 Add the new env vars to `api/.env` (local dev values)

## 2. Backend — MongoDB Connection

- [x] 2.1 Create `api/app/core/mongodb.py` with a `motor` `AsyncIOMotorClient` singleton and a `get_db()` FastAPI dependency
- [x] 2.2 Add startup/shutdown lifespan hooks in `api/main.py` to open and close the Motor connection
- [x] 2.3 Ensure `users` collection has a unique index on `email` (create index on startup)

## 3. Backend — Auth Models

- [x] 3.1 Create `api/app/models/user.py` with `UserCreate` (email, password), `UserInDB` (email, hashed_password, created_at), and `TokenResponse` (access_token, token_type) Pydantic models

## 4. Backend — Security Utilities

- [x] 4.1 Create `api/app/core/security.py` with `hash_password()`, `verify_password()` (passlib/bcrypt), `create_access_token()`, and `decode_access_token()` (python-jose HS256)
- [x] 4.2 Implement `get_current_user()` FastAPI dependency in `security.py` that extracts and verifies the Bearer token from the `Authorization` header, returning 401 on missing/invalid/expired tokens

## 5. Backend — Auth Router

- [x] 5.1 Create `api/app/routers/auth.py` with `POST /auth/register`: validate input, check for duplicate email, hash password, insert into MongoDB, return 201
- [x] 5.2 Add `POST /auth/login` to `auth.py`: look up user by email, verify bcrypt hash, issue JWT, return `TokenResponse`
- [x] 5.3 Register `auth.py` router in `api/main.py` with prefix `/auth`

## 6. Backend — Protect Chat Endpoint

- [x] 6.1 Add `Depends(get_current_user)` to `POST /chat/stream` in `api/app/routers/chat.py`
- [ ] 6.2 Manually test that an unauthenticated request to `/chat/stream` returns 401  ← manual

## 7. Frontend — Auth Utilities

- [x] 7.1 Create `web/lib/auth.ts` with `getToken()`, `setToken()`, `clearToken()` helpers (localStorage)
- [x] 7.2 Update `web/lib/chat-adapter.ts` to read the token via `getToken()` and attach `Authorization: Bearer <token>` header to the `/chat/stream` fetch

## 8. Frontend — Login Page

- [x] 8.1 Add shadcn/ui components needed: `Card`, `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `Input`, `Button` (run `npx shadcn@latest add` for any not yet installed)
- [x] 8.2 Create `web/components/login-form.tsx` (`"use client"`) using `react-hook-form` + `zod` schema (email required, password required); submit calls `POST /auth/login`, stores token, redirects to `/`
- [x] 8.3 Create `web/app/login/page.tsx` that renders `<LoginForm />` centered in a shadcn `Card`

## 9. Frontend — Route Protection

- [x] 9.1 Create `web/middleware.ts` that checks for a JWT in cookies or `localStorage` (via a readable cookie approach) and redirects unauthenticated users from `/` to `/login`
- [ ] 9.2 Verify redirect works: navigating to `/` without a token sends to `/login`; after login, redirects back to `/`  ← manual

## 10. Frontend — Logout

- [x] 10.1 Create `web/components/app-header.tsx` with the weft wordmark and a logout button that calls `clearToken()` and redirects to `/login`
- [x] 10.2 Update `web/app/page.tsx` to render `<AppHeader />` above the chat area

## 11. Testing

- [x] 11.1 Write `api/tests/unit/test_security.py`: test `hash_password`/`verify_password`, `create_access_token`/`decode_access_token`, and expired token rejection
- [x] 11.2 Write `api/tests/unit/test_auth_router.py`: mock MongoDB, test register (success, duplicate email, invalid input) and login (success, wrong password, unknown email) endpoints
- [x] 11.3 Run `uv run pytest` and confirm all tests pass
- [ ] 11.4 Manual end-to-end: register a user, log in via `/login` page, confirm chat streams, click logout, confirm redirect to `/login`, confirm `/chat/stream` returns 401 without token  ← manual
