## MODIFIED Requirements

### Requirement: Chat stream requires authentication
The `/chat/stream` endpoint SHALL require a valid JWT `Authorization: Bearer <token>` header on every request. Requests without a token or with an invalid/expired token SHALL be rejected before any LLM call is made.

#### Scenario: Authenticated request succeeds
- **WHEN** a client sends `POST /chat/stream` with a valid `Authorization: Bearer <token>` header
- **THEN** the system processes the request and streams the LLM response as before

#### Scenario: Missing Authorization header
- **WHEN** a client sends `POST /chat/stream` without an `Authorization` header
- **THEN** the system returns HTTP 401 with `{ "detail": "Not authenticated" }` and makes no LLM call

#### Scenario: Invalid token
- **WHEN** a client sends `POST /chat/stream` with a malformed or tampered JWT
- **THEN** the system returns HTTP 401 with `{ "detail": "Invalid token" }` and makes no LLM call

#### Scenario: Expired token
- **WHEN** a client sends `POST /chat/stream` with an expired JWT
- **THEN** the system returns HTTP 401 with `{ "detail": "Token expired" }` and makes no LLM call
