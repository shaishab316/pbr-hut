# Environment Configuration with Zod

Type-safe environment variable validation using Zod schema validation.

## Environment Variables

```env
# Application
APP_NAME=pbr-hut-backend
NODE_ENV=development
PORT=3000
GLOBAL_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pbrhut
DIRECT_URL=postgresql://user:password@localhost:5432/pbrhut

# Redis
REDIS_URL=redis://localhost:6379
REDIS_USERNAME=default
REDIS_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=604800  # 7 days in seconds

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=pbr_hut_preset

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=noreply@pbrhut.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_NAME=PBR Hut

# Features
ENABLE_SWAGGER=true
ENABLE_BULL_BOARD=true
```

## Validation Schema

```typescript
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),
  GLOBAL_PREFIX: z.string().default('api/v1'),
  
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),
  
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.coerce.number().default(604800),
  
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_PUBLISHABLE_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  CLOUDINARY_UPLOAD_PRESET: z.string(),
  
  MAIL_HOST: z.string(),
  MAIL_PORT: z.coerce.number(),
  MAIL_USER: z.string().email(),
  MAIL_PASSWORD: z.string(),
  MAIL_FROM_NAME: z.string(),
  
  ENABLE_SWAGGER: z.enum(['true', 'false']).default('true'),
  ENABLE_BULL_BOARD: z.enum(['true', 'false']).default('true')
});

export type Env = z.infer<typeof envSchema>;
```

## Config Service

```typescript
@Injectable()
export class ConfigService {
  private env: Env;

  constructor() {
    this.env = envSchema.parse(process.env);
  }

  get nodeEnv(): string {
    return this.env.NODE_ENV;
  }

  get port(): number {
    return this.env.PORT;
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get jwtSecret(): string {
    return this.env.JWT_SECRET;
  }

  get jwtExpiration(): number {
    return this.env.JWT_EXPIRATION;
  }

  // ... more getters
}
```

## Application Setup

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env']
    }),
    // Other modules
  ]
})
export class AppModule {}
```

## Using Config

```typescript
@Injectable()
export class AuthService {
  constructor(private config: ConfigService) {}

  async login(user: User): Promise<LoginResponse> {
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiration }
    );

    return { token };
  }
}
```

## Local Development

Create `.env.local`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/pbrhut_dev
JWT_SECRET=dev-secret-key-very-insecure
STRIPE_SECRET_KEY=sk_test_123
# ... other variables
```

Never commit `.env.local` to git. Use `.env.example` as template:

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

## Production Validation

```typescript
if (config.isProduction) {
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be 32+ characters in production');
  }
}
```

## Error on Invalid Config

Zod will throw error if validation fails:

```
Error: Parsing failed
  "PORT" - Expected number, received non-numeric string
  "JWT_SECRET" - String must contain at least 32 character(s)
```

## Best Practices

1. **Type-safe** - Zod provides TypeScript types
2. **Validated at startup** - Catch errors early
3. **Documented** - Schema shows all options
4. **Defaults** - Define sensible defaults
5. **Coercion** - Convert strings to numbers/booleans
6. **Never commit** - Use .env.local, commit .env.example
7. **Secrets in CI/CD** - Set via environment variables
