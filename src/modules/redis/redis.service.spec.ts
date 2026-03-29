import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedisClient));

const mockConfig = {
  get: jest.fn().mockReturnValue('redis://localhost:6379'),
} as unknown as ConfigService<any, true>;

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    service = new RedisService(mockConfig);
    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      expect(await service.exists('key')).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);
      expect(await service.exists('key')).toBe(false);
    });
  });

  describe('deleteByPattern', () => {
    it('should return 0 without calling del when no keys match', async () => {
      mockRedisClient.keys.mockResolvedValue([]);
      const result = await service.deleteByPattern('prefix:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should delete all matched keys', async () => {
      mockRedisClient.keys.mockResolvedValue(['prefix:1', 'prefix:2']);
      mockRedisClient.del.mockResolvedValue(2);
      const result = await service.deleteByPattern('prefix:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('prefix:1', 'prefix:2');
      expect(result).toBe(2);
    });
  });
});
