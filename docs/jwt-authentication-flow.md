# JWT Authentication Flow

JWT (JSON Web Token) authentication enables stateless, scalable authentication for the PBR Hut API. This page details the complete flow from registration through token validation and refresh.

## Overview

PBR Hut uses JWT tokens for authentication:

1. User registers or logs in
2. Server issues a JWT token
3. Client includes token in Authorization header
4. Server validates token on each request
5. Token expires after configured duration
6. Client can refresh token before expiration

## Token Structure

A JWT consists of three parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

- **Header**: Algorithm and token type (encoded Base64)
- **Payload**: Claims (user data, expiration)
- **Signature**: HMAC-SHA256 of header + payload using JWT_SECRET

## Authentication Endpoints

### Register

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "contactType": "email"
}
```

**Response 201:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

### Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "contact": "user@example.com",  // email or phone
  "password": "SecurePass123!",
  "contactType": "email"           // "email" or "phone"
}
```

**Response 200:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
    "tokenType": "Bearer"
  }
}
```

## Token Payload

```json
{
  "sub": "user_123",                 // User ID (subject)
  "email": "user@example.com",       // Email address
  "role": "CUSTOMER",                // User role
  "iat": 1676000000,                 // Issued at (timestamp)
  "exp": 1676604800                  // Expiration (timestamp)
}
```

**Token Duration**: Configured via `JWT_EXPIRES_IN` environment variable (default: 7 days)

## Using the Token

Include in Authorization header:

```bash
curl -X GET http://localhost:3000/api/v1/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Format**: `Bearer <token>`

The API extracts the token from the header and validates:
1. Signature is valid (using JWT_SECRET)
2. Token hasn't expired
3. Claims are intact

## Token Validation

### JwtGuard

Applied to protected endpoints:

```typescript
@Get('profile')
@UseGuards(JwtGuard)
getProfile(@CurrentUser() user: SafeUser) {
  return user;  // Guaranteed to be a valid user
}
```

If validation fails:

**Response 401:**
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized - Invalid or expired token"
}
```

### Extracting User Info

Use the `@CurrentUser()` decorator to get authenticated user:

```typescript
@Get('orders')
@UseGuards(JwtGuard)
getOrders(@CurrentUser() user: SafeUser) {
  // user = { id, email, role, iat, exp }
  return orderService.getOrdersByUserId(user.id);
}
```

## Password Security

Passwords are never stored in plain text:

1. **Hashing**: bcrypt with salt rounds = 10
2. **Verification**: Compare provided password against hash
3. **No Recovery**: Passwords cannot be recovered (only reset)

### Password Reset Flow

1. User requests password reset
2. System generates time-limited reset token
3. User receives reset link via email
4. User sets new password
5. Old tokens become invalid

```bash
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

System sends email with reset link (valid for 30 minutes):

```
https://app.example.com/reset-password?token=...
```

## Token Refresh

Clients can refresh tokens before expiration:

```bash
POST /api/v1/auth/refresh
Authorization: Bearer <current_token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

**Best Practice**: Refresh when remaining time < 24 hours

## Logout

Logout is client-side:

1. Client discards the access token
2. No server-side session to invalidate (stateless)
3. Token remains "valid" until expiration
4. For forced logout, implement a token blacklist (future enhancement)

## Multi-User Scenarios

### Admin Impersonation

Admins can login as other users for support:

```bash
POST /api/v1/auth/impersonate/:userId
Authorization: Bearer <admin_token>
```

The response includes an access token for the impersonated user (logged for audit trails).

### Machine-to-Machine (Future)

For API client integrations:

```bash
POST /api/v1/auth/machine-token
Content-Type: application/json

{
  "clientId": "app_123",
  "clientSecret": "secret_..."
}
```

Returns a machine token valid for 1 year (no user context).

## Security Best Practices

1. **Always use HTTPS** in production (tokens in plain HTTP are insecure)
2. **Store tokens securely** on client
   - ❌ localStorage (vulnerable to XSS)
   - ✅ httpOnly cookies (secure-flag)
   - ✅ Memory + refresh token rotation
3. **Include token in every request** (don't trust cached auth)
4. **Handle token expiration** gracefully (refresh or re-login)
5. **Implement rate limiting** on auth endpoints (prevents brute force)
6. **Rotate JWT_SECRET** periodically (invalidates all tokens)
7. **Never log tokens** in production logs
8. **Use strong JWT_SECRET** (min 32 characters)

## Token Verification Checklist

✅ Signature valid (matches JWT_SECRET)
✅ Token not expired (current time < exp)
✅ User account still active (not deleted/banned)
✅ User has not had password changed (optional)
✅ Required role/permissions present

## Environment Variables

```bash
JWT_SECRET=my-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d              # 7 days, 24h, 1h, etc.
JWT_ALGORITHM=HS256            # HMAC SHA256
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing header | Include `Authorization: Bearer <token>` |
| 401 Unauthorized | Invalid token | Re-login to get new token |
| 401 Unauthorized | Expired token | Refresh using `/auth/refresh` |
| 401 Unauthorized | Wrong JWT_SECRET | Check environment variable |

## OAuth2 Integration (Future)

Support for Google, GitHub, Apple sign-in is planned:

```bash
POST /api/v1/auth/google
{
  "googleIdToken": "..."
}
```

Would return same JWT response as regular login.
