import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

// ----------------------------------------------------------------------
// MOCKS
// ----------------------------------------------------------------------

const mockPipeline = {
  del: jest.fn(),
  exec: jest.fn().mockResolvedValue([]),
};

const mockRedisClient = {
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  flushdb: jest.fn(),
  scanStream: jest.fn(),
  pipeline: jest.fn(() => mockPipeline),
};

jest.mock('ioredis', () => {
  return jest.fn(() => mockRedisClient);
});

jest.mock('./redis.constant', () => ({
  CACHE_KEY: {
    TEST_PREFIX: 'test-prefix:',
  },
}));

// Standalone mock to prevent @typescript-eslint/unbound-method errors
const mockConfigGet = jest.fn().mockReturnValue('redis://localhost:6379');

describe('RedisService', () => {
  let service: RedisService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: mockConfigGet,
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);

    // Trap the logs so they don't clutter up the terminal output during tests
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  describe('Lifecycle methods', () => {
    it('should setup Redis with retry strategy and attach listeners', () => {
      service.onModuleInit();

      expect(mockConfigGet).toHaveBeenCalledWith('REDIS_URL', {
        infer: true,
      });

      expect(Redis).toHaveBeenCalledWith(
        'redis://localhost:6379',
        expect.objectContaining({
          maxRetriesPerRequest: 3,
          retryStrategy: expect.any(Function),
        }),
      );

      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
    });

    it('should log when Redis emits an error', () => {
      service.onModuleInit();

      // Dig out the error callback from the mock and trigger it manually
      const errorCallback = mockRedisClient.on.mock.calls.find(
        (call) => call[0] === 'error',
      )[1];

      errorCallback(new Error('Connection dropped by peer'));

      // This satisfies the unused var linter rule and improves our coverage!
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Redis connection error: Connection dropped by peer',
        ),
      );
    });

    it('should handle graceful shutdown', async () => {
      service.onModuleInit();
      await service.onModuleDestroy();

      expect(loggerLogSpy).toHaveBeenCalledWith('Disconnecting from Redis...');
      // It should try to quit gracefully first
      expect(mockRedisClient.quit).toHaveBeenCalled();
      // And always call disconnect as the fallback in the finally block
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('Core operations', () => {
    const keyFn = (ctx: any) => `${ctx.TEST_PREFIX}123`;
    const expectedKey = 'test-prefix:123';

    beforeEach(() => {
      service.onModuleInit();
    });

    describe('get', () => {
      it('should return null if Redis returns nothing', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        const result = await service.get(keyFn);
        expect(result).toBeNull();
      });

      it('should return plain string directly WITHOUT trying to parse JSON', async () => {
        const mockString = 'just-a-normal-string';
        mockRedisClient.get.mockResolvedValue(mockString);

        const jsonParseSpy = jest.spyOn(JSON, 'parse');
        const result = await service.get(keyFn);

        expect(result).toEqual(mockString);
        expect(jsonParseSpy).not.toHaveBeenCalled();

        jsonParseSpy.mockRestore();
      });

      it('should parse an object if the string looks like a JSON object {}', async () => {
        const mockData = { id: 123 };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(mockData));

        const result = await service.get(keyFn);
        expect(result).toEqual(mockData);
      });

      it('should parse an array if the string looks like a JSON array []', async () => {
        const mockData = [1, 2, 3];
        mockRedisClient.get.mockResolvedValue(JSON.stringify(mockData));

        const result = await service.get(keyFn);
        expect(result).toEqual(mockData);
      });

      it('should fallback to string if it looks like JSON but parsing fails', async () => {
        const brokenJson = '{ im broken }';
        mockRedisClient.get.mockResolvedValue(brokenJson);

        const result = await service.get(keyFn);
        expect(result).toEqual(brokenJson);
      });
    });

    describe('set', () => {
      it('should save plain strings as-is without expiration', async () => {
        await service.set(keyFn, 'plain-string');
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          expectedKey,
          'plain-string',
        );
      });

      it('should stringify objects and pass the EX flag if expiration is provided', async () => {
        const mockData = { id: 1 };
        const expireTime = 3600;

        await service.set(keyFn, mockData, expireTime);

        expect(mockRedisClient.set).toHaveBeenCalledWith(
          expectedKey,
          JSON.stringify(mockData),
          'EX',
          expireTime,
        );
      });
    });

    describe('del & exists', () => {
      it('should delete key', async () => {
        await service.del(keyFn);
        expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
      });

      it('should return true if exists returns > 0', async () => {
        mockRedisClient.exists.mockResolvedValue(1);
        const result = await service.exists(keyFn);
        expect(result).toBe(true);
      });

      it('should return false if exists returns 0', async () => {
        mockRedisClient.exists.mockResolvedValue(0);
        const result = await service.exists(keyFn);
        expect(result).toBe(false);
      });
    });

    describe('deleteByPattern (Async Stream)', () => {
      it('should iterate over chunks and delete using pipeline', async () => {
        mockRedisClient.scanStream.mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            // Added this await to satisfy strict ESLint rules for async generators.
            // It actually makes the mock more accurate since streams take a micro-tick!
            await Promise.resolve();

            yield ['test:1', 'test:2']; // First chunk
            yield ['test:3']; // Second chunk
            yield []; // Empty chunk (should safely be ignored)
          },
        });

        const deletedCount = await service.deleteByPattern('test:*');

        expect(mockRedisClient.scanStream).toHaveBeenCalledWith({
          match: 'test:*',
          count: 100,
        });

        // We yielded 3 total valid keys
        expect(deletedCount).toBe(3);

        // Pipeline should be called twice (once for each chunk with data in it)
        expect(mockRedisClient.pipeline).toHaveBeenCalledTimes(2);

        expect(mockPipeline.del).toHaveBeenCalledWith('test:1');
        expect(mockPipeline.del).toHaveBeenCalledWith('test:2');
        expect(mockPipeline.del).toHaveBeenCalledWith('test:3');

        expect(mockPipeline.exec).toHaveBeenCalledTimes(2);
      });
    });

    describe('flushDb', () => {
      it('should nuke the db', async () => {
        await service.flushDb();
        expect(mockRedisClient.flushdb).toHaveBeenCalled();
      });
    });
  });
});
