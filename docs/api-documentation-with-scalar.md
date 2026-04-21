# API Documentation with Scalar

Interactive OpenAPI documentation using Scalar with auto-generated endpoints from Swagger decorators.

## Endpoints

### View Interactive Documentation

```
http://localhost:3000/docs
```

### Download OpenAPI JSON

```
http://localhost:3000/api
```

## Setup

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// In main.ts
const config = new DocumentBuilder()
  .setTitle('PBR Hut API')
  .setDescription('Restaurant ordering and delivery platform')
  .setVersion('1.0.0')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    'JWT'
  )
  .addTag('Auth', 'Authentication endpoints')
  .addTag('Users', 'User management')
  .addTag('Items', 'Menu items')
  .addTag('Cart', 'Shopping cart')
  .addTag('Orders', 'Order management')
  .addTag('Riders', 'Rider operations')
  .addTag('Admin', 'Administration')
  .build();

const document = SwaggerModule.createDocument(app, config);

// Scalar UI (modern alternative to Swagger UI)
SwaggerModule.setup('docs', app, document, {
  swaggerOptions: {
    docExpansion: 'list'
  },
  customJs: ['/scalar-theme.js'],
  customCssUrl: ['/scalar-theme.css']
});

// Raw OpenAPI JSON
app.get('/api', (req, res) => {
  res.json(document);
});
```

## Documenting Endpoints

### Controller

```typescript
@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  @Post('register')
  @ApiOperation({ 
    summary: 'Register new user',
    description: 'Create account with email or phone'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: UserResponse
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input'
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered'
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
```

### DTO with Decorators

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    minLength: 8,
    example: 'SecurePass123'
  })
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: ['EMAIL', 'PHONE'],
    description: 'Contact strategy',
    default: 'EMAIL'
  })
  @IsEnum(['EMAIL', 'PHONE'])
  strategy: 'EMAIL' | 'PHONE';
}
```

### Response DTO

```typescript
export class UserResponse {
  @ApiProperty({ example: 'user_123' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ enum: ['CUSTOMER', 'RIDER', 'ADMIN'] })
  role: string;

  @ApiProperty({ example: '2024-01-20T10:00:00Z' })
  createdAt: Date;
}
```

## Paginated Responses

```typescript
export class PaginatedResponse<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      pages: { type: 'number' }
    }
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

## Authentication

Documents JWT bearer token:

```typescript
@ApiSecurity('JWT')
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

## Example Responses

```typescript
@ApiResponse({
  status: 200,
  schema: {
    example: {
      success: true,
      statusCode: 200,
      data: {
        id: 'user_123',
        email: 'user@example.com'
      }
    }
  }
})
```

## Scalar Features

### Try It Out

Click "Try it out" to:
1. Set request parameters
2. Enter request body
3. Execute request
4. View response

### Response Examples

Shows example responses for each status code

### Schema Viewer

View full schema definitions with nested types

### Authentication

Login with bearer token to test protected endpoints

## API Tags

Group related endpoints:

```
Auth
├── POST /register
├── POST /login
└── POST /refresh-token

Users
├── GET /profile
├── PATCH /profile
└── DELETE /account

Items
├── GET /items
├── GET /items/:id
└── (Admin only) POST /items

Orders
├── POST /orders
├── GET /orders
├── PATCH /orders/:id/status
└── GET /orders/:id/tracking
```

## Health Check

```typescript
@Get('health')
@ApiOperation({ summary: 'Health check' })
@ApiResponse({ status: 200, description: 'Service is healthy' })
health() {
  return { status: 'ok', timestamp: new Date() };
}
```

## Version Management

```typescript
.setVersion('1.0.0')

// In future versions
.addExternalDocumentation({
  name: 'Migration Guide',
  url: 'https://docs.pbrhut.com/v2-migration'
})
```

## Best Practices

1. **Document all endpoints** - No undocumented APIs
2. **Include examples** - Real, valid examples
3. **Document errors** - All status codes
4. **Use tags** - Group logically
5. **Clear descriptions** - What does this do?
6. **Authentication** - Mark which endpoints need auth
7. **Keep updated** - Update when API changes
8. **Test endpoints** - Via Scalar UI before release
