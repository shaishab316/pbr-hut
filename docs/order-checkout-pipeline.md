# Order Checkout Pipeline

The checkout pipeline is the critical path from cart to confirmed order. Every step is validated server-side to prevent fraud and data corruption.

## Checkout Flow

```
1. Validate Cart
   ↓
2. Validate Delivery Address
   ↓
3. Create Payment Intent (Stripe)
   ↓
4. Client Confirms Payment
   ↓
5. Verify Payment (webhook or poll)
   ↓
6. Create Order (atomic)
   ├── Create immutable OrderItems
   ├── Lock inventory
   ├── Create Payment record
   ├── Send confirmation email (async)
   └── Notify restaurant
   ↓
7. Return Order to Client
```

## Endpoint

```bash
POST /api/v1/orders
Authorization: Bearer <customer_token>

{
  "cartId": "cart_1",
  "deliveryAddressId": "addr_1",
  "deliveryType": "DELIVERY",
  "scheduledFor": "2024-01-20T19:30:00Z",
  "stripePaymentMethodId": "pm_123"
}
```

## Request Validation

```typescript
@Post()
@UseGuards(JwtGuard)
async createOrder(
  @Body() dto: CreateOrderDto,
  @CurrentUser() user: SafeUser
): Promise<OrderResponse> {
  // 1. Get cart
  const cart = await this.cartRepository.findById(dto.cartId);
  if (!cart || cart.userId !== user.id) {
    throw new NotFoundException('Cart not found');
  }

  // 2. Verify cart not empty
  if (cart.items.length === 0) {
    throw new BadRequestException('Cart is empty');
  }

  // 3. Validate address
  const address = await this.addressRepository.findById(dto.deliveryAddressId);
  if (!address || address.userId !== user.id) {
    throw new NotFoundException('Address not found');
  }

  // 4. Verify all items still available
  for (const item of cart.items) {
    const dbItem = await this.itemRepository.findById(item.itemId);
    if (!dbItem || !dbItem.isAvailable) {
      throw new ConflictException(`${dbItem.name} is no longer available`);
    }
  }

  // 5. Recalculate totals (server-side)
  const pricing = await this.calculateOrderPricing(cart);

  // 6. Create Stripe payment intent
  const paymentIntent = await this.stripeService.createPaymentIntent({
    amount: pricing.totalInCents,
    customerId: user.id,
    paymentMethodId: dto.stripePaymentMethodId
  });

  // 7. Confirm payment
  const paymentResult = await this.stripeService.confirmPayment(
    paymentIntent.id
  );

  if (paymentResult.status !== 'succeeded') {
    throw new PaymentFailedException('Payment declined');
  }

  // 8. Create order (within transaction)
  return await this.prisma.$transaction(async (tx) => {
    // Create order
    const order = await tx.order.create({
      data: {
        customerId: user.id,
        restaurantId: cart.restaurantId,
        status: 'CONFIRMED',
        totalInCents: pricing.totalInCents,
        taxInCents: pricing.taxInCents,
        deliveryFeeInCents: pricing.deliveryFeeInCents,
        deliveryType: dto.deliveryType,
        billingAddressId: address.id,
        shippingAddressId: address.id
      }
    });

    // Create immutable order items (snapshots)
    for (const cartItem of cart.items) {
      const item = await tx.item.findUnique({
        where: { id: cartItem.itemId }
      });
      
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          itemId: cartItem.itemId,
          itemName: item.name,        // Snapshot
          itemPrice: cartItem.pricePerUnit,
          quantity: cartItem.quantity,
          sizeId: cartItem.sizeId,
          sizeName: cartItem.sizeName
        }
      });
    }

    // Create payment record
    await tx.payment.create({
      data: {
        orderId: order.id,
        amount: pricing.totalInCents,
        status: 'COMPLETED',
        stripePaymentId: paymentResult.id,
        method: 'STRIPE'
      }
    });

    // Delete cart
    await tx.cart.delete({ where: { id: cart.id } });

    return order;
  });
}
```

## Order Structure

```json
{
  "id": "order_1",
  "status": "CONFIRMED",
  "totalInCents": 2050,
  "taxInCents": 150,
  "deliveryFeeInCents": 0,
  "items": [
    {
      "itemName": "Burger",
      "itemPrice": 600,
      "quantity": 2,
      "size": "Large",
      "subtotal": 1200
    }
  ],
  "payment": {
    "status": "COMPLETED",
    "method": "STRIPE"
  },
  "delivery": {
    "type": "DELIVERY",
    "scheduledFor": "2024-01-20T19:30:00Z",
    "address": { ... }
  },
  "createdAt": "2024-01-20T18:00:00Z"
}
```

## Pricing Calculation

```typescript
async calculateOrderPricing(cart: Cart): Promise<PricingBreakdown> {
  let subtotal = 0;
  
  // Sum all items
  for (const item of cart.items) {
    subtotal += item.pricePerUnit * item.quantity;
  }

  // Calculate tax
  const taxRate = 0.05;
  const tax = Math.floor(subtotal * taxRate);

  // Delivery fee
  const deliveryFee = cart.deliveryType === 'DELIVERY' ? 500 : 0;

  return {
    subtotalInCents: subtotal,
    taxInCents: tax,
    deliveryFeeInCents: deliveryFee,
    totalInCents: subtotal + tax + deliveryFee
  };
}
```

## Atomicity

The entire order creation is wrapped in a transaction to ensure consistency:

```typescript
await this.prisma.$transaction(async (tx) => {
  // All operations succeed or all fail
});
```

If any step fails, the entire transaction is rolled back.

## Immutability

OrderItems capture snapshots of:
- Item name and price at time of order
- Selected size and price
- Selected extras and prices

This ensures historical accuracy even if menu items change later.

## Error Handling

| Scenario | Response |
|----------|----------|
| Cart not found | 404 Not Found |
| Cart empty | 400 Bad Request |
| Item unavailable | 409 Conflict |
| Address not found | 404 Not Found |
| Payment declined | 402 Payment Required |
| Database error | 500 Internal Server Error |

## Best Practices

1. **Validate everything** - Don't trust client
2. **Recalculate prices** - Server-side always
3. **Use transactions** - Atomic all-or-nothing
4. **Create snapshots** - Immutable order records
5. **Handle payment async** - Verify webhooks
6. **Send confirmation** - Async via BullMQ
7. **Notify restaurant** - Real-time updates
