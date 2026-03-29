import { AuthCacheRepository } from '../repository/auth.cache.repository';
import { RedisService } from '@/modules/redis/redis.service';

const mockRedis = {
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
};

const unverifiedUser = {
  name: 'John',
  email: 'john@example.com',
  phone: null,
  passwordHash: 'hashed',
  createdAt: new Date(),
  identifierType: 'email' as const,
};

describe('AuthCacheRepository', () => {
  let repo: AuthCacheRepository;

  beforeEach(() => {
    repo = new AuthCacheRepository(mockRedis as unknown as RedisService);
    jest.clearAllMocks();
  });

  describe('saveUnverifiedUser', () => {
    it('should store user with 15 min TTL', async () => {
      await repo.saveUnverifiedUser('john@example.com', unverifiedUser);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'unverified:john@example.com',
        900,
        JSON.stringify(unverifiedUser),
      );
    });
  });

  describe('getUnverifiedUser', () => {
    it('should return parsed user from cache', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(unverifiedUser));

      const result = await repo.getUnverifiedUser('john@example.com');

      expect(result).toMatchObject({ name: 'John', email: 'john@example.com' });
    });

    it('should return null if not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await repo.getUnverifiedUser('john@example.com');

      expect(result).toBeNull();
    });

    it('should delete and return null on corrupted cache', async () => {
      mockRedis.get.mockResolvedValue('invalid json{{{');

      const result = await repo.getUnverifiedUser('john@example.com');

      expect(mockRedis.del).toHaveBeenCalledWith('unverified:john@example.com');
      expect(result).toBeNull();
    });
  });

  describe('deleteUnverifiedUser', () => {
    it('should delete from redis', async () => {
      await repo.deleteUnverifiedUser('john@example.com');

      expect(mockRedis.del).toHaveBeenCalledWith('unverified:john@example.com');
    });
  });
});
