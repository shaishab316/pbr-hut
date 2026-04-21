# Contact Strategy Pattern

The Contact Strategy Pattern enables flexible user authentication through multiple contact methods (email or phone) while maintaining a unified auth interface.

## Overview

Users can login and register using either email or phone number. The system automatically detects which strategy to use based on the contact type.

## Registration

```bash
POST /api/v1/auth/register
{
  "contact": "user@example.com",
  "contactType": "email",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

Or with phone:

```bash
POST /api/v1/auth/register
{
  "contact": "+880XXXXXXXXX",
  "contactType": "phone",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

## Login

```bash
POST /api/v1/auth/login
{
  "contact": "user@example.com",  // or phone
  "contactType": "email",
  "password": "SecurePass123!"
}
```

## Implementation

```typescript
// Strategy Interface
interface ContactStrategy {
  validate(contact: string): Promise<boolean>;
  findUser(contact: string): Promise<User | null>;
}

// Email Strategy
class EmailStrategy implements ContactStrategy {
  async validate(email: string): Promise<boolean> {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  async findUser(email: string): Promise<User | null> {
    return userRepository.findByEmail(email);
  }
}

// Phone Strategy
class PhoneStrategy implements ContactStrategy {
  async validate(phone: string): Promise<boolean> {
    return /^\+\d{10,15}$/.test(phone);
  }
  
  async findUser(phone: string): Promise<User | null> {
    return userRepository.findByPhone(phone);
  }
}

// Auth Service
class AuthService {
  constructor(
    private emailStrategy: EmailStrategy,
    private phoneStrategy: PhoneStrategy
  ) {}
  
  async login(contact: string, contactType: 'email' | 'phone') {
    const strategy = contactType === 'email' 
      ? this.emailStrategy 
      : this.phoneStrategy;
    
    if (!await strategy.validate(contact)) {
      throw new BadRequestException('Invalid contact');
    }
    
    const user = await strategy.findUser(contact);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    return this.generateToken(user);
  }
}
```

## Benefits

1. **Flexibility**: Users choose their preferred contact method
2. **Consistency**: Unified auth interface regardless of method
3. **Extensibility**: Easy to add new strategies (SMS, WhatsApp, etc.)
4. **Maintenance**: Strategies encapsulated and testable independently

## Design Pattern

This is an implementation of the **Strategy Pattern**:

- Define a family of algorithms (contact validation)
- Encapsulate each one
- Make them interchangeable
- Let the client choose which one to use

## Future Strategies

- SMS-based authentication
- WhatsApp authentication
- Social login (Google, Facebook)
- Biometric authentication

## Testing

```typescript
describe('ContactStrategy', () => {
  it('should validate email format', async () => {
    const result = await emailStrategy.validate('user@example.com');
    expect(result).toBe(true);
  });

  it('should reject invalid email', async () => {
    const result = await emailStrategy.validate('invalid-email');
    expect(result).toBe(false);
  });

  it('should validate phone format', async () => {
    const result = await phoneStrategy.validate('+880XXXXXXXXX');
    expect(result).toBe(true);
  });
});
```

## User Model

```prisma
model User {
  id       String   @id @default(cuid())
  email    String?  @unique
  phone    String?  @unique
  password String
  role     UserRole @default(CUSTOMER)
  
  // At least one contact method required
  // Unique constraints ensure no duplicate contact methods
}
```

## Error Handling

| Scenario | Response |
|----------|----------|
| Invalid email format | 400 Bad Request |
| Invalid phone format | 400 Bad Request |
| User not found | 401 Unauthorized |
| Wrong password | 401 Unauthorized |
| Unsupported contact type | 400 Bad Request |

## Best Practices

1. **Validate both format and existence** before authentication
2. **Use consistent error messages** to prevent user enumeration attacks
3. **Support case-insensitive emails** but case-sensitive phones
4. **Normalize phone numbers** to E.164 format
5. **Make strategies testable** with dependency injection
