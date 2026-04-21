# API Conventions and Standards

This page documents the conventions and standards used throughout the PBR Hut API for consistency, predictability, and developer experience.

## Response Format

All API responses follow a standardized envelope format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### Response Fields

- **success** (boolean): Indicates if the request was successful
- **statusCode** (number): HTTP status code (200, 201, 400, 401, etc.)
- **message** (string): Human-readable message describing the result
- **data** (object | array): The actual response payload
- **pagination** (object, optional): Included for paginated endpoints

### Cache Headers

When data is served from Redis cache:

```
X-Cache: HIT
X-Cache-TTL: 300
```

When data comes from database:

```
X-Cache: MISS
```

## Error Handling

All errors follow the same envelope structure:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning | Typical Use |
|------|---------|------------|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Invalid request parameters |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected error |

## Authentication

### Bearer Token Format

Include JWT in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload

```json
{
  "sub": "user_123",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "iat": 1676000000,
  "exp": 1676604800
}
```

### Refresh Tokens

Tokens expire after `JWT_EXPIRES_IN` (default 7 days). To refresh:

```bash
POST /api/v1/auth/refresh
Authorization: Bearer <current_token>
```

Response includes new access token.

## Naming Conventions

### Endpoints

- **Resources**: Use plural nouns
  - `GET /api/v1/users` ✅
  - `GET /api/v1/user` ❌

- **Actions**: Use verbs after resource ID
  - `POST /api/v1/orders/:id/cancel` ✅
  - `POST /api/v1/cancel-order/:id` ❌

- **Nesting**: Only nest 2 levels deep
  - `GET /api/v1/orders/:orderId/items/:itemId` ✅
  - `GET /api/v1/users/:userId/addresses/:addressId/coordinates` ❌

### Fields

- **Case**: Use camelCase in JSON responses
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "emailAddress": "john@example.com"
  }
  ```

- **Booleans**: Prefix with `is` or `has`
  ```json
  {
    "isActive": true,
    "hasNotifications": false,
    "isSoftDeleted": false
  }
  ```

- **Timestamps**: Use ISO 8601 format (UTC)
  ```json
  {
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:45:00Z"
  }
  ```

- **Amounts**: Use numbers (not strings)
  ```json
  {
    "totalAmount": 1250.50,
    "tax": 125.05,
    "discount": 50.00
  }
  ```

## Query Parameters

### Pagination

```bash
GET /api/v1/items?page=1&limit=10
```

- **page**: 1-indexed (default 1)
- **limit**: Max items per page (default 10, max 100)

Response includes:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### Filtering

```bash
GET /api/v1/items?category=burger&inStock=true
```

Filters are endpoint-specific and documented in each endpoint's spec.

### Sorting

```bash
GET /api/v1/items?sort=name:asc
GET /api/v1/items?sort=price:desc
```

- Format: `field:asc|desc`
- Multiple sorts: Repeat parameter
- Default: Chronological (by createdAt DESC)

### Searching

```bash
GET /api/v1/items?search=burger
```

Search across text fields (name, description, etc.). Case-insensitive.

## Rate Limiting

Rate limits are enforced per IP address and per authenticated user:

- **Unauthenticated**: 100 requests/hour
- **Authenticated**: 1000 requests/hour
- **Admin**: Unlimited

Rate limit info in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1676604800
```

## Data Types

### Money Amounts

Always use numbers with 2 decimal places, stored as cents in database:

```json
{
  "priceInCents": 1250,  // $12.50
  "totalInCents": 5000   // $50.00
}
```

### Enums

Represented as strings (not numbers):

```json
{
  "orderStatus": "COMPLETED",
  "userRole": "CUSTOMER",
  "itemSize": "LARGE"
}
```

Valid values are case-sensitive and uppercase.

### Dates

ISO 8601 format in UTC:

```json
{
  "createdAt": "2024-01-15T10:30:00Z",
  "birthDate": "1990-05-20"
}
```

### Coordinates

Use GeoJSON format for location data:

```json
{
  "location": {
    "type": "Point",
    "coordinates": [73.1734, 24.2389]  // [lng, lat]
  }
}
```

## Input Validation

Request bodies are validated using Zod schemas. Validation errors return 400:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Must be at least 8 characters"
    }
  ]
}
```

### Common Validations

- **Email**: Valid RFC 5322 format
- **Password**: Min 8 chars, 1 uppercase, 1 number, 1 special char
- **Phone**: Valid E.164 format (+880XXXXXXXXX)
- **URL**: Valid absolute HTTP(S) URL
- **Enum**: Must be one of predefined values

## Versioning

API is versioned in the URL path:

- Current: `/api/v1/` (stable)
- Future: `/api/v2/` (when breaking changes needed)

Breaking changes:
- Removing a field
- Changing field type
- Changing endpoint behavior

Non-breaking changes:
- Adding optional field
- Adding new endpoint
- Adding optional query parameter

## Documentation

All endpoints are documented via Swagger decorators:

```typescript
@Get('items/:id')
@ApiOperation({ summary: 'Fetch single item' })
@ApiParam({ name: 'id', type: 'string' })
@ApiResponse({ status: 200, type: ItemResponseDto })
@ApiResponse({ status: 404, description: 'Item not found' })
getItem(@Param('id') id: string) { ... }
```

View at `/docs` (Scalar UI) or `/api` (JSON spec).

## Best Practices

1. **Use HTTP methods correctly**
   - GET: Read (no side effects)
   - POST: Create
   - PATCH: Partial update
   - DELETE: Remove

2. **Use appropriate status codes**
   - 200 for successful GET
   - 201 for successful POST
   - 204 for successful DELETE with no content

3. **Include error details**
   - Don't return empty error messages
   - Specify which field failed validation

4. **Paginate large datasets**
   - Never return more than 100 items without pagination
   - Use reasonable defaults (10-50 items)

5. **Cache HTTP responses**
   - GET responses are cacheable
   - Include Cache-Control headers where appropriate

6. **Design for idempotency**
   - POST to same endpoint twice shouldn't create duplicates
   - Use unique request IDs for retry logic
