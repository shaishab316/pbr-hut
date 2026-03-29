# Auth Module — Developer Documentation

> **Base path:** `/auth`  
> **Pipe:** `ZodValidationPipe` (nestjs-zod) — all validation errors return `400` with a structured body.  
> **Auth:** All endpoints in this module are **public** (no JWT guard). Protected routes in other modules use the `JwtAuthGuard`.

---

## Table of Contents

- [Auth Module — Developer Documentation](#auth-module--developer-documentation)
  - [Table of Contents](#table-of-contents)
  - [1. Architecture Overview](#1-architecture-overview)
  - [2. Identifier Types](#2-identifier-types)
  - [3. Complete Flow Diagrams](#3-complete-flow-diagrams)
    - [3.1 Registration Flow](#31-registration-flow)
    - [3.2 Login Flow](#32-login-flow)
    - [3.3 Forgot Password Flow](#33-forgot-password-flow)
  - [4. Endpoint Reference](#4-endpoint-reference)
    - [4.1 `POST /auth/register`](#41-post-authregister)
      - [Request](#request)
      - [Response `200`](#response-200)
      - [Errors](#errors)
    - [4.2 `POST /auth/verify-otp`](#42-post-authverify-otp)
      - [Request](#request-1)
      - [Response `200` — when `verifyReason = "register"`](#response-200--when-verifyreason--register)
      - [Response `200` — when `verifyReason = "forgot-password"`](#response-200--when-verifyreason--forgot-password)
      - [Errors](#errors-1)
    - [4.3 `POST /auth/resend-otp`](#43-post-authresend-otp)
      - [Request](#request-2)
      - [Response `200`](#response-200-1)
      - [Errors](#errors-2)
    - [4.4 `POST /auth/login`](#44-post-authlogin)
      - [Request](#request-3)
      - [Response `200`](#response-200-2)
      - [Errors](#errors-3)
    - [4.5 `POST /auth/forgot-password`](#45-post-authforgot-password)
      - [Request](#request-4)
      - [Response `200`](#response-200-3)
      - [Errors](#errors-4)
    - [4.6 `POST /auth/reset-password`](#46-post-authreset-password)
      - [Request](#request-5)
      - [Response `200`](#response-200-4)
      - [Errors](#errors-5)
  - [5. Error Reference](#5-error-reference)
    - [Complete Error Map](#complete-error-map)
  - [6. Security Model](#6-security-model)
    - [OTP](#otp)
    - [Password Reset Token (JWT)](#password-reset-token-jwt)
    - [Password Hashing](#password-hashing)
    - [Unverified Users](#unverified-users)
  - [7. Redis Key Reference](#7-redis-key-reference)
  - [8. Integration Checklist](#8-integration-checklist)
    - [New User Registration](#new-user-registration)
    - [Returning User Login](#returning-user-login)
    - [Forgot Password](#forgot-password)
    - [OTP Expired During Registration](#otp-expired-during-registration)
    - [Token Expiry Handling (Protected Routes)](#token-expiry-handling-protected-routes)

---

## 1. Architecture Overview

```
AuthController
      │
      ▼
AuthService
  ├── ContactStrategyFactory      resolves email or phone strategy
  │     ├── EmailContactStrategy
  │     └── PhoneContactStrategy
  ├── OtpService                  generates & verifies TOTP via otplib
  ├── AuthCacheRepository         Redis-backed (unverified users, reset nonces)
  ├── UserRepository              Postgres via Prisma
  └── JwtService                  signs / verifies JWT tokens
```

The **Strategy Pattern** is the core design decision here. Every operation that differs between email and phone (finding a user, building contact fields, sending a message) is delegated to the resolved strategy. `AuthService` itself never checks `identifierType === 'email'` — the factory handles that.

---

## 2. Identifier Types

Every request that involves a contact point carries an `identifierType` discriminant field.

| Value | Required field | Example |
|-------|---------------|---------|
| `"email"` | `email` | `"john@example.com"` |
| `"phone"` | `phone` | `"+8801712345678"` |

> `identifierType` defaults to `"email"` when omitted — but you should always send it explicitly to avoid ambiguity.

Phone numbers must conform to **E.164 format** and contain 10–15 digits after stripping non-digit characters.

---

## 3. Complete Flow Diagrams

### 3.1 Registration Flow

```
Client                          Server                         Redis / DB
  │                               │                               │
  │── POST /auth/register ────────►│                               │
  │   { email, name, password }   │                               │
  │                               │── findExistingUser() ────────►│
  │                               │◄─ null ───────────────────────│
  │                               │── saveUnverifiedUser() ──────►│  Redis TTL
  │                               │── generate OTP ──────────────►│  (otplib TOTP)
  │                               │── sendVerification() ─────────┼──► Email/SMS
  │◄── 200 { identifier } ────────│                               │
  │                               │                               │
  │── POST /auth/verify-otp ──────►│                               │
  │   { email, otp,               │                               │
  │     verifyReason: "register" }│                               │
  │                               │── otpService.verify() ────────│
  │                               │── getUnverifiedUser() ───────►│
  │                               │◄─ unverifiedUser ─────────────│
  │                               │── userRepo.create() ─────────►│  Postgres
  │                               │── deleteUnverifiedUser() ────►│  cleanup
  │◄── 200 { message } ───────────│                               │
  │                               │                               │
  │  (user now logs in normally)  │                               │
```

**Key points:**
- The unverified user lives in Redis only — no DB row exists until OTP is confirmed.
- `identifierType` is stored in Redis alongside the user data so `resendOtp` can re-resolve the correct strategy without re-receiving the full payload.
- After `userRepo.create()` succeeds, the Redis entry is deleted. If creation fails, the cache entry survives so the user can retry.

---

### 3.2 Login Flow

```
Client                          Server
  │                               │
  │── POST /auth/login ───────────►│
  │   { email, password }         │
  │                               │── findExistingUserWithPassword()
  │                               │   (includes passwordHash)
  │                               │── comparePassword()
  │                               │── jwtService.sign({ sub, identifier })
  │◄── 200 { token, user } ───────│
  │                               │
  │   ┌─────────────────────────────────────────────────────┐
  │   │ All subsequent requests:                             │
  │   │ Authorization: Bearer <token>                        │
  │   └─────────────────────────────────────────────────────┘
```

The JWT payload shape:

```ts
type JwtPayload = {
  sub: string;        // userId
  identifier: string; // email or phone
};
```

The returned `user` object **never contains `passwordHash`** — it is stripped before the response.

---

### 3.3 Forgot Password Flow

This is a 3-step flow. Each step depends on state from the previous one.

```
Client                          Server                         Redis
  │                               │                               │
  │  STEP 1 ─────────────────────────────────────────────────── │
  │── POST /auth/forgot-password ─►│                               │
  │   { email }                   │── findExistingUser()          │
  │                               │── saveResetPasswordNonce() ──►│  nonce = uuid
  │                               │── otpService.generate(nonce)  │  OTP keyed on nonce
  │                               │── sendPasswordReset() ─────────┼──► Email/SMS
  │◄── 200 { identifier } ────────│                               │
  │                               │                               │
  │  STEP 2 ─────────────────────────────────────────────────── │
  │── POST /auth/verify-otp ──────►│                               │
  │   { email, otp,               │── otpService.verify(otp,      │
  │     verifyReason:             │     identifier) ──────────────│
  │     "forgot-password" }       │── findExistingUser()          │
  │                               │── getResetPasswordNonce() ───►│
  │                               │── jwtService.sign(            │
  │                               │     { sub, nonce })           │
  │◄── 200 { token } ─────────────│                               │
  │                               │   ⚠ nonce NOT deleted yet     │
  │                               │                               │
  │  STEP 3 ─────────────────────────────────────────────────── │
  │── POST /auth/reset-password ──►│                               │
  │   { token, newPassword }      │── jwtService.verify(token)    │
  │                               │── getResetPasswordNonce() ───►│
  │                               │   compare nonce in token      │
  │                               │   vs nonce in Redis           │
  │                               │── userRepo.update(            │
  │                               │     hash(newPassword))        │
  │                               │── deleteResetPasswordNonce() ►│  cleanup
  │◄── 200 { message } ───────────│                               │
```

**Why OTP is generated from the nonce (not the email/phone):**  
The nonce is a server-generated UUID stored in Redis. Using it as the OTP seed means the OTP is bound to this specific reset session — not just to the user's identifier. This prevents OTP reuse across sessions.

**Why the nonce is NOT deleted after verify-otp (Step 2):**  
If the nonce were deleted after verification, the token issued in Step 2 would be immediately orphaned with no way to validate it in Step 3. The nonce acts as a binding secret between the JWT and Redis — it is only cleaned up once the password is actually updated.

---

## 4. Endpoint Reference

### 4.1 `POST /auth/register`

Registers a new user. Sends an OTP to the provided contact. The user is **not persisted to the database** until OTP is verified.

#### Request

```json
// Email
{
  "identifierType": "email",
  "email": "john@example.com",
  "name": "John Doe",
  "password": "SecurePass123"
}

// Phone
{
  "identifierType": "phone",
  "phone": "+8801712345678",
  "name": "John Doe",
  "password": "SecurePass123"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `identifierType` | `"email" \| "phone"` | defaults to `"email"` |
| `email` | `string` | required when `identifierType = "email"`, valid email |
| `phone` | `string` | required when `identifierType = "phone"`, E.164 format |
| `name` | `string` | 1–100 characters |
| `password` | `string` | 8–32 characters |

#### Response `200`

```json
{
  "message": "Verification sent",
  "data": {
    "identifier": "john@example.com"
  }
}
```

> Save `identifier` — you will need it for `POST /auth/resend-otp`.

#### Errors

| Status | Condition |
|--------|-----------|
| `400` | User with this email/phone already exists |
| `400` | Validation failure (missing/invalid fields) |

---

### 4.2 `POST /auth/verify-otp`

Verifies a 6-digit OTP. Behaviour differs based on `verifyReason`.

#### Request

```json
// Registration verification
{
  "identifierType": "email",
  "email": "john@example.com",
  "otp": "482910",
  "verifyReason": "register"
}

// Forgot-password verification
{
  "identifierType": "email",
  "email": "john@example.com",
  "otp": "193847",
  "verifyReason": "forgot-password"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `identifierType` | `"email" \| "phone"` | defaults to `"email"` |
| `email` / `phone` | `string` | same rules as register |
| `otp` | `string` | exactly 6 digits |
| `verifyReason` | `"register" \| "forgot-password"` | defaults to `"register"` |

#### Response `200` — when `verifyReason = "register"`

```json
{
  "message": "Account verified successfully"
}
```

User is now created in Postgres. Proceed to `POST /auth/login`.

#### Response `200` — when `verifyReason = "forgot-password"`

```json
{
  "message": "OTP verified, you can now reset your password",
  "data": {
    "token": "<signed-jwt>"
  }
}
```

> Save `token` — it is required in the next step (`POST /auth/reset-password`). It is a short-lived JWT and should be used immediately.

#### Errors

| Status | Condition |
|--------|-----------|
| `401` | OTP is invalid or expired |
| `400` | Registration: Redis session expired (user must sign up again) |
| `401` | Forgot-password: User not found for this identifier |
| `400` | Forgot-password: Reset session expired (must call forgot-password again) |
| `400` | Validation failure |

---

### 4.3 `POST /auth/resend-otp`

Resends the OTP for an active registration session. The session must still be alive in Redis.

> This endpoint only works for **registration** sessions. Forgot-password resend is done by calling `POST /auth/forgot-password` again.

#### Request

```json
{
  "identifier": "john@example.com"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `identifier` | `string` | The `identifier` value returned from `POST /auth/register` |

#### Response `200`

```json
{
  "message": "Verification resent",
  "data": {
    "identifier": "john@example.com"
  }
}
```

#### Errors

| Status | Condition |
|--------|-----------|
| `400` | Session has expired — user must call `/auth/register` again |
| `400` | Validation failure (empty identifier) |

---

### 4.4 `POST /auth/login`

Authenticates an existing, verified user and returns a JWT.

#### Request

```json
// Email
{
  "identifierType": "email",
  "email": "john@example.com",
  "password": "SecurePass123"
}

// Phone
{
  "identifierType": "phone",
  "phone": "+8801712345678",
  "password": "SecurePass123"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `identifierType` | `"email" \| "phone"` | defaults to `"email"` |
| `email` / `phone` | `string` | same rules as register |
| `password` | `string` | 8–32 characters |

#### Response `200`

```json
{
  "message": "Login successful",
  "data": {
    "token": "<signed-jwt>",
    "user": {
      "id": "cm9xyz...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": null,
      "role": "CUSTOMER",
      "isActive": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

> `passwordHash` is **never returned** in the user object.

Use the token in subsequent requests:

```
Authorization: Bearer <token>
```

#### Errors

| Status | Condition |
|--------|-----------|
| `401` | User not found for this identifier |
| `401` | Password is incorrect |
| `400` | Validation failure |

---

### 4.5 `POST /auth/forgot-password`

Initiates the password reset flow. Generates a nonce-bound OTP and sends it to the user's contact.

#### Request

```json
// Email
{
  "identifierType": "email",
  "email": "john@example.com"
}

// Phone
{
  "identifierType": "phone",
  "phone": "+8801712345678"
}
```

#### Response `200`

```json
{
  "message": "Password reset OTP sent",
  "data": {
    "identifier": "john@example.com"
  }
}
```

#### Errors

| Status | Condition |
|--------|-----------|
| `400` | No user found with this identifier |
| `400` | Validation failure |

> Calling this endpoint again before resetting the password will **overwrite** the existing nonce in Redis. Any previously issued OTP and token from Step 2 will become invalid.

---

### 4.6 `POST /auth/reset-password`

Completes the password reset. Requires the JWT token from `POST /auth/verify-otp` (Step 2).

#### Request

```json
{
  "token": "<jwt-from-verify-otp>",
  "newPassword": "NewSecurePass456"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `token` | `string` | JWT issued by `POST /auth/verify-otp` |
| `newPassword` | `string` | 8–32 characters |

#### Response `200`

```json
{
  "message": "Password reset successful"
}
```

The user can now log in with the new password via `POST /auth/login`.

#### Errors

| Status | Condition |
|--------|-----------|
| `400` | Token payload is malformed (missing nonce) |
| `400` | Nonce in token does not match Redis — token reuse or session expired |
| `400` | User not found (edge case: account deleted between steps) |
| `400` | Validation failure |

---

## 5. Error Reference

All errors follow NestJS's standard exception shape:

```json
{
  "statusCode": 400,
  "message": "Human-readable error string",
  "error": "Bad Request"
}
```

Validation errors from `ZodValidationPipe` return an array of issues:

```json
{
  "statusCode": 400,
  "message": [
    {
      "path": ["password"],
      "message": "Password must be at least 8 characters"
    }
  ],
  "error": "Bad Request"
}
```

### Complete Error Map

| Endpoint | Status | Message | When |
|----------|--------|---------|------|
| `/register` | `400` | `Already have an account with this identifier, please login instead` | Duplicate user |
| `/verify-otp` | `401` | `Invalid or expired OTP` | Wrong or timed-out OTP |
| `/verify-otp` | `400` | `Session expired, please sign up again` | Redis TTL expired (register flow) |
| `/verify-otp` | `401` | `Invalid credentials, user not found` | No user for identifier (forgot-password flow) |
| `/verify-otp` | `400` | `Session expired, please initiate forgot password again` | Nonce TTL expired |
| `/resend-otp` | `400` | `Session expired, please sign up again` | Redis TTL expired |
| `/login` | `401` | `Invalid credentials, user not found` | No matching user |
| `/login` | `401` | `Invalid credentials, incorrect password` | Wrong password |
| `/forgot-password` | `400` | `User not found with this identifier` | No matching user |
| `/reset-password` | `400` | `Invalid token payload` | JWT missing nonce field |
| `/reset-password` | `400` | `Invalid or expired token` | Nonce mismatch |
| `/reset-password` | `400` | `User not found` | Account not in DB |

---

## 6. Security Model

### OTP

> See [`docs/otp/otp.md`](./otp/otp.md) for full OTP generation, verification, TTL, and configuration details.

- For registration: OTP is keyed on the **user's identifier** (email or phone).
- For forgot-password: OTP is keyed on the **server-generated nonce** — not the identifier. This means an OTP issued for one reset session cannot be used for another, even for the same user.

### Password Reset Token (JWT)

The token issued after OTP verification in the forgot-password flow carries:

```ts
type ResetPasswordTokenPayload = {
  sub: string;   // userId
  nonce: string; // must match what is stored in Redis
};
```

Double-validation at `/reset-password`:
1. JWT signature is verified by `jwtService.verify()`.
2. `payload.nonce` is compared against `getResetPasswordNonce(payload.sub)` from Redis.

Both must pass. This prevents:
- Token forgery (JWT signature check)
- Token reuse after a second `/forgot-password` call invalidates the old nonce (Redis check)

### Password Hashing

All passwords are hashed before storage using `hashPassword()` (bcrypt under the hood). The raw password is never logged or persisted.

### Unverified Users

An unverified user record lives **only in Redis** until OTP confirmation. If the session expires, no partial data remains in the database.

---

## 7. Redis Key Reference

| Key pattern | Value | Set by | Deleted by | TTL |
|-------------|-------|--------|------------|-----|
| `unverified:<identifier>` | `UnverifiedUser` JSON | `/auth/register` | `/auth/verify-otp` (success) | Configured in `AuthCacheRepository` |
| `reset-nonce:<userId>` | nonce `string` (UUID) | `/auth/forgot-password` | `/auth/reset-password` (success) | Configured in `AuthCacheRepository` |

> Inspect `AuthCacheRepository` for exact key names and TTL values. If you change TTLs, update the OTP window accordingly — see [`docs/otp/otp.md`](./otp/otp.md). A user cannot verify an OTP after the Redis session has expired regardless of the OTP's own validity window.

---

## 8. Integration Checklist

Follow this in order when wiring up a client (web, mobile, Postman, etc.):

### New User Registration

- [ ] `POST /auth/register` → receive `identifier`
- [ ] `POST /auth/verify-otp` with `verifyReason: "register"` → receive `200`
- [ ] `POST /auth/login` → receive `token` + `user`
- [ ] Store token, attach as `Authorization: Bearer <token>` on all protected requests

### Returning User Login

- [ ] `POST /auth/login` → receive `token` + `user`
- [ ] Store token

### Forgot Password

- [ ] `POST /auth/forgot-password` → receive `identifier`
- [ ] Ask user for OTP received on email/phone
- [ ] `POST /auth/verify-otp` with `verifyReason: "forgot-password"` → receive `token`
- [ ] Ask user for new password
- [ ] `POST /auth/reset-password` with `token` + `newPassword` → receive success
- [ ] Redirect to login

### OTP Expired During Registration

- [ ] `POST /auth/resend-otp` with `identifier` (from register response)
- [ ] If response is `400` "Session expired" → user must go back to `/register`

### Token Expiry Handling (Protected Routes)

When a `401` is returned on a protected route:
- [ ] Clear the stored token
- [ ] Redirect to login — there is no refresh token mechanism in this module

---

*Last updated: reflecting `auth.service.ts` + `auth.controller.ts` at current revision. Keep this document in sync when adding OAuth, refresh tokens, or new `identifierType` variants.*