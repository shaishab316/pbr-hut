import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { RedisService } from '@/infra/redis/redis.service';
import { AuthCacheRepository } from './auth.cache.repository';

describe('AuthCacheRepository', () => {
  let repo: AuthCacheRepository;

  const redis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  } as unknown as jest.Mocked<Pick<RedisService, 'set' | 'get' | 'del'>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthCacheRepository,
        {
          provide: RedisService,
          useValue: redis,
        },
      ],
    }).compile();

    repo = moduleRef.get(AuthCacheRepository);
  });

  describe('unverified signup cache', () => {
    it('saveUnverifiedUser() should call redis.set with key selector, data, and TTL (15 minutes)', async () => {
      const identifier = 'test@example.com';
      const data = {
        name: 'Test',
        email: 'test@example.com',
        phone: null,
        passwordHash: 'hash',
        createdAt: new Date(),
        identifierType: 'EMAIL',
        role: UserRole.CUSTOMER,
      } as any;

      await repo.saveUnverifiedUser(identifier, data);

      expect(redis.set).toHaveBeenCalledTimes(1);

      const [keySelector, value, ttl] = (redis.set as jest.Mock).mock.calls[0];
      expect(typeof keySelector).toBe('function');
      expect(value).toBe(data);
      expect(ttl).toBe(15 * 60);

      // ensure the selector uses the expected ctx path
      const ctx = {
        AUTH: {
          UNVERIFIED_USER: (id: string) => `AUTH:UNVERIFIED_USER:${id}`,
        },
      };
      expect(keySelector(ctx)).toBe(`AUTH:UNVERIFIED_USER:${identifier}`);
    });

    it('getUnverifiedUser() should call redis.get with key selector and return the value', async () => {
      const identifier = 'test@example.com';
      const cached = { foo: 'bar' };

      (redis.get as jest.Mock).mockResolvedValueOnce(cached);

      const res = await repo.getUnverifiedUser(identifier);

      expect(redis.get).toHaveBeenCalledTimes(1);
      const [keySelector] = (redis.get as jest.Mock).mock.calls[0];
      expect(typeof keySelector).toBe('function');

      const ctx = {
        AUTH: {
          UNVERIFIED_USER: (id: string) => `AUTH:UNVERIFIED_USER:${id}`,
        },
      };
      expect(keySelector(ctx)).toBe(`AUTH:UNVERIFIED_USER:${identifier}`);
      expect(res).toBe(cached);
    });

    it('getUnverifiedUser() should return null when redis.get returns null', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const res = await repo.getUnverifiedUser('missing@example.com');

      expect(res).toBeNull();
    });

    it('deleteUnverifiedUser() should call redis.del with key selector', async () => {
      const identifier = 'test@example.com';

      await repo.deleteUnverifiedUser(identifier);

      expect(redis.del).toHaveBeenCalledTimes(1);
      const [keySelector] = (redis.del as jest.Mock).mock.calls[0];
      expect(typeof keySelector).toBe('function');

      const ctx = {
        AUTH: {
          UNVERIFIED_USER: (id: string) => `AUTH:UNVERIFIED_USER:${id}`,
        },
      };
      expect(keySelector(ctx)).toBe(`AUTH:UNVERIFIED_USER:${identifier}`);
    });
  });

  describe('password reset nonce cache', () => {
    it('createPasswordResetNonce() should generate a nonce, store it with TTL (10 minutes), and return it', async () => {
      const userId = 'user-123';

      const nonce = await repo.createPasswordResetNonce(userId);

      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);

      expect(redis.set).toHaveBeenCalledTimes(1);

      const [keySelector, value, ttl] = (redis.set as jest.Mock).mock.calls[0];
      expect(typeof keySelector).toBe('function');
      expect(value).toBe(nonce);
      expect(ttl).toBe(10 * 60);

      const ctx = {
        AUTH: {
          PASSWORD_RESET: (id: string) => `AUTH:PASSWORD_RESET:${id}`,
        },
      };
      expect(keySelector(ctx)).toBe(`AUTH:PASSWORD_RESET:${userId}`);
    });

    it('getPasswordResetNonce() should call redis.get with key selector and return the nonce', async () => {
      const userId = 'user-123';
      const nonce = 'nonce-abc';

      (redis.get as jest.Mock).mockResolvedValueOnce(nonce);

      const res = await repo.getPasswordResetNonce(userId);

      expect(redis.get).toHaveBeenCalledTimes(1);
      const [keySelector] = (redis.get as jest.Mock).mock.calls[0];
      expect(typeof keySelector).toBe('function');

      const ctx = {
        AUTH: {
          PASSWORD_RESET: (id: string) => `AUTH:PASSWORD_RESET:${id}`,
        },
      };
      expect(keySelector(ctx)).toBe(`AUTH:PASSWORD_RESET:${userId}`);
      expect(res).toBe(nonce);
    });

    it('getPasswordResetNonce() should return null when redis.get returns null', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const res = await repo.getPasswordResetNonce('user-404');

      expect(res).toBeNull();
    });

    it('deletePasswordResetNonce() should call redis.del with key selector', async () => {
      const userId = 'user-123';

      await repo.deletePasswordResetNonce(userId);

      expect(redis.del).toHaveBeenCalledTimes(1);
      const [keySelector] = (redis.del as jest.Mock).mock.calls[0];
      expect(typeof keySelector).toBe('function');

      const ctx = {
        AUTH: {
          PASSWORD_RESET: (id: string) => `AUTH:PASSWORD_RESET:${id}`,
        },
      };
      expect(keySelector(ctx)).toBe(`AUTH:PASSWORD_RESET:${userId}`);
    });
  });
});
