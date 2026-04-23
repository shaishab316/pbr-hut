import { EmailContactStrategy } from '../strategies/email.contact.strategy';
import { UserRepository } from '../../user/repositories/user.repository';
import { MAIL_QUEUE } from '@/modules/mail/mail.constants';

const mockUserRepo = {
  findByEmail: jest.fn(),
  findByEmailWithPassword: jest.fn(),
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

const mockSafeUser = {
  id: 'user-id-1',
  name: 'John',
  email: 'john@example.com',
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  role: 'CUSTOMER' as const,
};

const QUEUE_OPTIONS = expect.objectContaining({ attempts: expect.any(Number) });

describe('EmailContactStrategy', () => {
  let strategy: EmailContactStrategy;

  beforeEach(() => {
    strategy = new EmailContactStrategy(
      mockUserRepo as unknown as UserRepository,
      mockMailQueue as any,
    );
    jest.clearAllMocks();
  });

  it('returns email as identifier', () => {
    expect(strategy.getIdentifier(emailDto)).toBe('john@example.com');
  });

  it('builds contact fields with email only', () => {
    expect(strategy.buildContactFields(emailDto)).toEqual({
      email: 'john@example.com',
    });
  });

  it('finds existing user by email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'uuid' });

    const result = await strategy.findExistingUser(emailDto);

    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('john@example.com');
    expect(result).toEqual({ id: 'uuid' });
  });

  it('queues verification email containing OTP in body', async () => {
    await strategy.sendVerification(unverifiedUser, '123456');

    expect(mockMailQueue.add).toHaveBeenCalledWith(
      MAIL_QUEUE,
      expect.objectContaining({
        email: 'john@example.com',
        subject: expect.any(String),
        body: expect.stringContaining('123456'),
      }),
      QUEUE_OPTIONS,
    );
  });

  it('queues password reset email containing OTP in body', async () => {
    await strategy.sendPasswordReset(mockSafeUser, '654321');

    expect(mockMailQueue.add).toHaveBeenCalledWith(
      MAIL_QUEUE,
      expect.objectContaining({
        email: 'john@example.com',
        subject: expect.any(String),
        body: expect.stringContaining('654321'),
      }),
      QUEUE_OPTIONS,
    );
  });
});
