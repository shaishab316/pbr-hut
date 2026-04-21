# Role-Based Access Control

Role-Based Access Control (RBAC) enables fine-grained authorization in PBR Hut. Three principal roles define what authenticated users can do.

## Roles

### CUSTOMER
- Browse menu items and categories
- Create and manage shopping cart
- Place orders
- View order history
- Manage own profile
- Rate/review items
- Track delivery status

### RIDER
- View assigned orders
- Update delivery status
- Access own earnings dashboard
- Manage availability
- View route optimization

### ADMIN
- Full system access
- Manage restaurants
- Manage menu items, categories, tags
- Manage users (create, edit, disable)
- View analytics dashboard
- Process refunds
- View all orders

## Implementation

### RolesGuard

Applied to protected endpoints:

```typescript
@Post('items')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
createItem(@Body() dto: CreateItemDto) {
  // Only ADMIN can access
}
```

### Multiple Roles

```typescript
@Get('orders/:id')
@UseGuards(JwtGuard, RolesGuard)
@Roles('CUSTOMER', 'RIDER', 'ADMIN')
getOrder(@Param('id') id: string) {
  // Multiple roles allowed
}
```

### Permission Matrix

| Resource | CUSTOMER | RIDER | ADMIN |
|----------|----------|-------|-------|
| Browse Items | ✅ | ❌ | ✅ |
| Create Item | ❌ | ❌ | ✅ |
| View Orders | Own | Assigned | All |
| Cancel Order | Own | ❌ | All |
| View Analytics | ❌ | Own | All |
| Manage Users | ❌ | ❌ | ✅ |

## Database Schema

```prisma
enum UserRole {
  CUSTOMER
  RIDER
  ADMIN
}

model User {
  id       String   @id
  email    String   @unique
  role     UserRole @default(CUSTOMER)
  // ...
}
```

## Checking Permissions

In services:

```typescript
getOrderDetails(orderId: string, user: SafeUser) {
  // ADMIN can view any order
  if (user.role === 'ADMIN') {
    return orderRepository.findById(orderId);
  }
  
  // CUSTOMER can only view own orders
  if (user.role === 'CUSTOMER') {
    return orderRepository.findByIdAndCustomerId(orderId, user.id);
  }
  
  // RIDER can only view assigned orders
  throw new ForbiddenException('Insufficient permissions');
}
```

## Custom Decorators

```typescript
@Get('dashboard')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
getDashboard() { ... }

@Get('earnings')
@UseGuards(JwtGuard, RolesGuard)
@Roles('RIDER')
getEarnings(@CurrentUser() user: SafeUser) { ... }
```

## Dynamic Permissions

Some operations depend on data ownership:

```typescript
@Patch('orders/:id/cancel')
@UseGuards(JwtGuard)
cancelOrder(@Param('id') id: string, @CurrentUser() user: SafeUser) {
  const order = await orderRepository.findById(id);
  
  // Customer can only cancel own orders
  if (user.role === 'CUSTOMER' && order.customerId !== user.id) {
    throw new ForbiddenException('Cannot cancel others\' orders');
  }
  
  // Admin can cancel any order
  return orderService.cancel(id);
}
```

## Error Responses

**Insufficient Role 403:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Forbidden - Insufficient permissions"
}
```

## Best Practices

1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Check at Multiple Levels**: Controller, service, repository
3. **Audit Sensitive Operations**: Log admin actions
4. **Implement Soft Deletes**: Don't actually delete user accounts
5. **Use Decorators**: For cleaner, more readable code
6. **Document Role Requirements**: In API documentation

## Permission Hierarchy

```
┌─────────────────────────┐
│       ADMIN             │
│   (Full Access)         │
└─────────────────────────┘
        ▲        ▲
        │        │
   ┌────┴──┬─────┴────┐
   │       │          │
┌──▼──┐ ┌──▼──┐  ┌───▼───┐
│RIDER│ │ADMIN│  │CUSTOMER│
│Assigned│Orders   │All Operations│
└──────┘ └──────┘  └────────┘
```

## Future: Fine-Grained Permissions

Planned enhancements:
- Per-restaurant admin access
- Rider scheduling permissions
- Customer preference controls

## Testing RBAC

```typescript
describe('Order Controller - RBAC', () => {
  it('should allow CUSTOMER to view own orders', async () => {
    const customer = { id: 'user_1', role: 'CUSTOMER' };
    // Test passes
  });

  it('should deny CUSTOMER to view other orders', async () => {
    const customer = { id: 'user_1', role: 'CUSTOMER' };
    // Should throw ForbiddenException
  });

  it('should allow ADMIN to view any order', async () => {
    const admin = { id: 'admin_1', role: 'ADMIN' };
    // Test passes
  });
});
```
