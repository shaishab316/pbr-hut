import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '@/modules/user/repositories/user.repository';

const mockUserRepo = {
  findById: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('test-secret'),
} as unknown as ConfigService<any, true>;

const payload = { sub: 'uuid', identifier: 'john@example.com' };
const safeUser = { id: 'uuid', name: 'John', email: 'john@example.com' };

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(
      mockConfig,
      mockUserRepo as unknown as UserRepository,
    );
    jest.clearAllMocks();
  });

  it('should return user when found', async () => {
    mockUserRepo.findById.mockResolvedValue(safeUser);
    const result = await strategy.validate(payload);
    expect(mockUserRepo.findById).toHaveBeenCalledWith('uuid');
    expect(result).toEqual(safeUser);
  });

  it('should throw UnauthorizedException when user not found', async () => {
    mockUserRepo.findById.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
