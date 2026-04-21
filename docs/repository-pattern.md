# Repository Pattern

The Repository Pattern abstracts data access logic, making code more testable, maintainable, and independent of the underlying database technology.

## Architecture

```
Controller → Service → Repository → Database
```

## Implementation

```typescript
// user.repository.ts
@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserDto) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async findAll(options: PaginationOptions) {
    return this.prisma.user.findMany({
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });
  }
}

// user.service.ts
@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getUserProfile(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    return this.userRepository.create(dto);
  }
}

// user.controller.ts
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.getUserProfile(id);
  }

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }
}
```

## Benefits

1. **Testability**: Mock repository in tests
2. **Separation of Concerns**: Data access isolated
3. **Reusability**: Repository used by multiple services
4. **Maintainability**: Changes in one place
5. **Abstraction**: Hide Prisma complexity

## Testing

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(() => {
    repository = mock(UserRepository);
    service = new UserService(repository);
  });

  it('should get user by id', async () => {
    const user = { id: '1', email: 'user@example.com' };
    jest.spyOn(repository, 'findById').mockResolvedValue(user);

    const result = await service.getUserProfile('1');
    expect(result).toEqual(user);
  });

  it('should throw if user not found', async () => {
    jest.spyOn(repository, 'findById').mockResolvedValue(null);

    await expect(service.getUserProfile('1')).rejects.toThrow(NotFoundException);
  });
});
```

## Query Optimization

```typescript
// Avoid N+1 queries
async findOrdersWithItems(userId: string) {
  // ❌ Bad: N queries
  const orders = await this.prisma.order.findMany({
    where: { customerId: userId }
  });
  for (const order of orders) {
    order.items = await this.prisma.orderItem.findMany({
      where: { orderId: order.id }
    });
  }

  // ✅ Good: 1 query
  return this.prisma.order.findMany({
    where: { customerId: userId },
    include: { items: true }
  });
}
```

## Generic Repository Pattern

```typescript
@Injectable()
export abstract class BaseRepository<T> {
  constructor(private model: any) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }

  async create(data: any): Promise<T> {
    return this.model.create({ data });
  }

  async findAll(): Promise<T[]> {
    return this.model.findMany();
  }

  async update(id: string, data: any): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({ where: { id } });
  }
}

// Extend for specific models
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(private prisma: PrismaService) {
    super(prisma.user);
  }

  async findByEmail(email: string) {
    return this.model.findUnique({ where: { email } });
  }
}
```

## Best Practices

1. **One repository per aggregate**
2. **Keep repositories thin** - Business logic in service
3. **Use generic repositories** - Reduce boilerplate
4. **Inject dependencies** - Enable testing
5. **Name methods clearly** - `findById`, `findMany`, `create`, etc.
