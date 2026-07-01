## ADDED Requirements

### Requirement: User registration
The system SHALL allow a new user to register with a unique email address and a password. The password SHALL be stored as a bcrypt hash. The plain-text password SHALL never be persisted.

#### Scenario: Successful registration
- **WHEN** a client sends `POST /auth/register` with a valid email and a non-empty password
- **THEN** the system stores the user in MongoDB with a bcrypt-hashed password and returns HTTP 201 with `{ "message": "User created" }`

#### Scenario: Duplicate email
- **WHEN** a client sends `POST /auth/register` with an email that already exists in MongoDB
- **THEN** the system returns HTTP 409 with `{ "detail": "Email already registered" }`

#### Scenario: Invalid email format
- **WHEN** a client sends `POST /auth/register` with a malformed email (e.g. no `@` sign)
- **THEN** the system returns HTTP 422 with a Pydantic validation error

#### Scenario: Missing password
- **WHEN** a client sends `POST /auth/register` with an empty or missing password field
- **THEN** the system returns HTTP 422 with a validation error

### Requirement: User login
The system SHALL authenticate a registered user by verifying their email and password and SHALL return a signed JWT access token on success.

#### Scenario: Successful login
- **WHEN** a client sends `POST /auth/login` with a matching email and correct password
- **THEN** the system returns HTTP 200 with `{ "access_token": "<jwt>", "token_type": "bearer" }`

#### Scenario: Wrong password
- **WHEN** a client sends `POST /auth/login` with a valid email but incorrect password
- **THEN** the system returns HTTP 401 with `{ "detail": "Invalid credentials" }`

#### Scenario: Unknown email
- **WHEN** a client sends `POST /auth/login` with an email that does not exist in MongoDB
- **THEN** the system returns HTTP 401 with `{ "detail": "Invalid credentials" }` (same response as wrong password to prevent email enumeration)

### Requirement: JWT access token
The system SHALL issue HS256-signed JWTs containing the user's email as the subject claim and an expiry claim (`exp`) set to `JWT_EXPIRE_MINUTES` minutes from issuance.

#### Scenario: Token contains expected claims
- **WHEN** a JWT is issued via `/auth/login`
- **THEN** decoding the token with the correct secret SHALL yield `{ "sub": "<email>", "exp": <future timestamp> }`

#### Scenario: Expired token rejected
- **WHEN** a client presents a JWT whose `exp` is in the past
- **THEN** the system SHALL return HTTP 401 with `{ "detail": "Token expired" }`

### Requirement: User logout
The system SHALL allow an authenticated user to log out. On logout, the JWT SHALL be cleared from both `localStorage` and the browser cookie. The user SHALL be redirected to `/login`.

#### Scenario: Successful logout via UI
- **WHEN** an authenticated user clicks the logout button in the application header
- **THEN** the system clears `weft_access_token` from `localStorage` and expires the `weft_access_token` cookie, then redirects the user to `/login`

#### Scenario: Accessing protected route after logout
- **WHEN** a user has logged out and navigates to `/`
- **THEN** Next.js middleware intercepts the request and redirects to `/login` because no valid token cookie is present

### Requirement: Frontend login page
The system SHALL provide a `/login` page in the Next.js app, built exclusively with shadcn/ui components, where a user can enter their email and password to authenticate.

#### Scenario: Successful login via UI
- **WHEN** a user enters valid credentials on `/login` and submits the form
- **THEN** the system stores the returned JWT in `localStorage` and redirects the user to the chat page (`/`)

#### Scenario: Failed login via UI
- **WHEN** a user enters invalid credentials on `/login` and submits the form
- **THEN** the system displays an inline error message without navigating away

#### Scenario: Unauthenticated access to chat
- **WHEN** a user navigates to `/` without a valid JWT in `localStorage`
- **THEN** Next.js middleware redirects them to `/login`
