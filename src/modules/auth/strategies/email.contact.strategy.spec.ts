import { EmailContactStrategy } from '../strategies/email.contact.strategy';
import { UserRepository } from '../../user/repositories/user.repository';

const mockUserRepo = {
  findByEmail: jest.fn(),
};

const mockMailQueue = {
  add: jest.fn().mockResolvedValue(undefined),
};

const emailDto = {
  identifierType: 'email' as const,
  email: 'john@example.com',
  name: 'John',
  password: 'password123',
};

const unverifiedUser = {
  name: 'John',
  email: 'john@example.com',
  phone: null,
  passwordHash: 'hashed',
  createdAt: new Date(),
  identifierType: 'email' as const,
};

describe('EmailContactStrategy', () => {
  let strategy: EmailContactStrategy;

  beforeEach(() => {
    strategy = new EmailContactStrategy(
      mockUserRepo as unknown as UserRepository,
      mockMailQueue as any,
    );
    jest.clearAllMocks();
  });

  it('should return email as identifier', () => {
    expect(strategy.getIdentifier(emailDto)).toBe('john@example.com');
  });

  it('should build contact fields', () => {
    expect(strategy.buildContactFields(emailDto)).toEqual({
      email: 'john@example.com',
    });
  });

  it('should find existing user by email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'uuid' });

    const result = await strategy.findExistingUser(emailDto);

    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('john@example.com');
    expect(result).toEqual({ id: 'uuid' });
  });

  it('should queue a welcome email with OTP', async () => {
    await strategy.sendVerification(
      {
        ...unverifiedUser,
        identifierType: 'email',
      },
      '123456',
    );

    expect(mockMailQueue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ email: 'john@example.com', otp: '123456' }),
      expect.any(Object),
    );
  });
});
