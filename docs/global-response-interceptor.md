# Global Response Interceptor

Standardizes all API responses to a consistent format with automatic error wrapping.

## Response Format

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  },
  "timestamp": "2024-01-20T18:00:00Z"
}
```

## Implementation

```typescript
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const request = context.switchToHttp().getRequest();
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Handle paginated responses
        let response = {
          success: true,
          statusCode,
          message: 'Operation successful',
          data,
          timestamp: new Date().toISOString()
        };

        if (Array.isArray(data) && data.length > 0) {
          const page = parseInt(request.query.page) || 1;
          const limit = parseInt(request.query.limit) || 10;
          const total = data[0]?.meta?.total || data.length;

          response = {
            ...response,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit)
            },
            data: data.map(({ meta, ...item }) => item)
          };
        }

        return response;
      })
    );
  }
}
```

## Error Response

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
  ],
  "timestamp": "2024-01-20T18:00:00Z"
}
```

## Exception Filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let statusCode = 500;
    let message = 'Internal server error';
    let errors: any[] = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message || exception.message;
      errors = exceptionResponse.errors || [];
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Pagination Query

```bash
GET /api/v1/items?page=2&limit=20
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Server Error |

## Validation Errors

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email" },
    { "field": "password", "message": "Must be 8+ characters" }
  ]
}
```

## Custom Response Messages

```typescript
// Success
return {
  message: 'User created successfully'
};

// Conflict
throw new ConflictException('Email already registered');

// Not Found
throw new NotFoundException('User not found');

// Validation
throw new BadRequestException('Invalid input');
```

## Usage

```typescript
@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // Returns: { success: true, data: user, ... }
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@Query('page') page: number) {
    // Returns: { success: true, data: users[], pagination: {...} }
    return this.usersService.findAll(page);
  }
}
```

## Best Practices

1. **Consistent format** - All endpoints match
2. **Meaningful messages** - Help client debugging
3. **Include pagination** - For list endpoints
4. **Error details** - Show what failed
5. **Timestamps** - For debugging
