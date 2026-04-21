# OTP Verification System

One-Time Passwords (OTP) provide an additional layer of security for sensitive operations like password resets and account verification.

## Overview

OTP (One-Time Password) is a time-based code sent to the user's email or phone. Each code is valid for exactly 10 minutes.

## Verification Flow

```
1. User requests OTP
   ↓
2. System generates 6-digit code
   ↓
3. Code stored in Redis with 10-min TTL
   ↓
4. Code sent via email/SMS
   ↓
5. User receives code
   ↓
6. User submits code
   ↓
7. System validates against Redis
   ↓
8. Code deleted from Redis
   ↓
9. User verified
```

## Endpoints

### Request OTP

```bash
POST /api/v1/otp/request
{
  "contact": "user@example.com",
  "contactType": "email",
  "purpose": "password-reset"  // or "account-verification"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to email",
  "data": {
    "expiresIn": 600  // seconds
  }
}
```

### Verify OTP

```bash
POST /api/v1/otp/verify
{
  "contact": "user@example.com",
  "contactType": "email",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified",
  "data": {
    "token": "reset_token_..."  // Temp token for password reset
  }
}
```

## Implementation

```typescript
@Injectable()
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_TTL = 600;  // 10 minutes
  
  constructor(private redisService: RedisService) {}
  
  async generateOtp(contact: string): Promise<string> {
    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in Redis with TTL
    const key = `otp:${contact}`;
    await this.redisService.set(key, code, this.OTP_TTL);
    
    return code;
  }
  
  async verifyOtp(contact: string, code: string): Promise<boolean> {
    const key = `otp:${contact}`;
    const storedCode = await this.redisService.get(key);
    
    if (!storedCode) {
      throw new BadRequestException('OTP expired or not found');
    }
    
    if (storedCode !== code) {
      throw new BadRequestException('Invalid OTP');
    }
    
    // Delete OTP after verification
    await this.redisService.delete(key);
    
    return true;
  }
}
```

## Redis Keys

```
otp:{contact}          # The OTP code (TTL: 600s)
otp:attempts:{contact} # Failed attempt count (TTL: 3600s)
```

## Security

### Rate Limiting

```typescript
async requestOtp(contact: string): Promise<void> {
  const key = `otp:requests:${contact}`;
  const count = await this.redisService.increment(key);
  
  if (count === 1) {
    await this.redisService.expire(key, 3600);  // 1 hour
  }
  
  if (count > 5) {
    throw new TooManyRequestsException(
      'Too many OTP requests. Try again in 1 hour'
    );
  }
}
```

### Failed Attempt Tracking

```typescript
async verifyOtp(contact: string, code: string): Promise<void> {
  const attemptsKey = `otp:attempts:${contact}`;
  const attempts = await this.redisService.get(attemptsKey);
  
  if (attempts && parseInt(attempts) >= 3) {
    throw new TooManyRequestsException('Too many failed attempts');
  }
  
  // ... verify code ...
  
  if (invalid) {
    await this.redisService.increment(attemptsKey);
    throw new BadRequestException('Invalid OTP');
  }
  
  // Success - clear attempts
  await this.redisService.delete(attemptsKey);
}
```

## Use Cases

### Password Reset

```
1. User requests password reset
2. OTP sent to registered email
3. User submits OTP
4. System generates reset token
5. User sets new password using reset token
```

### Account Verification

```
1. New user registers
2. OTP sent to email
3. User submits OTP to verify email
4. Account becomes fully active
```

### Sensitive Operations

```
1. User attempts to change email
2. OTP sent to current email
3. User submits OTP
4. Email changed only after verification
```

## Testing

```typescript
describe('OtpService', () => {
  it('should generate 6-digit code', async () => {
    const code = await otpService.generateOtp('user@example.com');
    expect(code).toMatch(/^\d{6}$/);
  });

  it('should verify correct OTP', async () => {
    const code = await otpService.generateOtp('user@example.com');
    const result = await otpService.verifyOtp('user@example.com', code);
    expect(result).toBe(true);
  });

  it('should reject expired OTP', async () => {
    const code = await otpService.generateOtp('user@example.com');
    // Wait for expiration
    await new Promise(r => setTimeout(r, 11000));
    
    await expect(
      otpService.verifyOtp('user@example.com', code)
    ).rejects.toThrow();
  });

  it('should lock after 3 failed attempts', async () => {
    await otpService.generateOtp('user@example.com');
    
    for (let i = 0; i < 3; i++) {
      try {
        await otpService.verifyOtp('user@example.com', '000000');
      } catch (e) {
        // Expected
      }
    }
    
    await expect(
      otpService.verifyOtp('user@example.com', '000000')
    ).rejects.toThrow('Too many failed attempts');
  });
});
```

## Environment Variables

```bash
OTP_SECRET=my-otp-base-secret    # For TOTP generation
TEST_OTP=123456                  # Fixed OTP for testing (dev only)
```

## Best Practices

1. **Always use HTTPS** - OTP codes could be intercepted
2. **Use short expiration** - 10 minutes is standard
3. **Limit attempts** - Prevent brute force attacks
4. **Send via multiple channels** - Email + SMS when possible
5. **Log OTP events** - For security audits
6. **Use strong secrets** - If implementing TOTP

## Future Enhancements

- SMS delivery via Twilio
- Backup codes for account recovery
- TOTP (Time-based OTP) with authenticator apps
- Email-based verification links
