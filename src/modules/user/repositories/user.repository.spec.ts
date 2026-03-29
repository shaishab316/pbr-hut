import { UserRepository } from './user.repository';
import { PrismaService } from '@/infra/prisma/prisma.service';

const safeUser = {
  id: 'uuid',
  name: 'John',
  email: 'john@example.com',
  phone: null,
};
const userWithPassword = { ...safeUser, passwordHash: 'hashed' };

const mockPrisma = {
  user: {
    create: jest.fn().mockResolvedValue(safeUser),
    findUnique: jest.fn().mockResolvedValue(safeUser),
  },
};

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = new UserRepository(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  it('create — omits passwordHash', async () => {
    const result = await repo.create({
      name: 'John',
      email: 'john@example.com',
      passwordHash: 'hashed',
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ omit: { passwordHash: true } }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('findByEmail — omits passwordHash', async () => {
    await repo.findByEmail('john@example.com');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ omit: { passwordHash: true } }),
    );
  });

  it('findByEmailWithPassword — includes passwordHash', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
    const result = await repo.findByEmailWithPassword('john@example.com');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    });
    expect(result).toHaveProperty('passwordHash');
  });

  it('findById — omits passwordHash', async () => {
    await repo.findById('uuid');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ omit: { passwordHash: true } }),
    );
  });

  it('findByPhone — omits passwordHash', async () => {
    await repo.findByPhone('+8801712345678');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ omit: { passwordHash: true } }),
    );
  });

  it('findByPhoneWithPassword — includes passwordHash', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWithPassword);
    const result = await repo.findByPhoneWithPassword('+8801712345678');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { phone: '+8801712345678' },
    });
    expect(result).toHaveProperty('passwordHash');
  });

  it('findByEmail — returns null when not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await repo.findByEmail('notfound@example.com');
    expect(result).toBeNull();
  });
});
