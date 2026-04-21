# Admin Dashboard Analytics

Comprehensive analytics and metrics for restaurant operators and system administrators.

## Dashboard Endpoints

### Get Overview Stats

```bash
GET /api/v1/admin/analytics/overview
Authorization: Bearer <admin_token>
?period=today|week|month|year
```

Response:
```json
{
  "success": true,
  "data": {
    "orders": {
      "total": 1250,
      "pending": 23,
      "confirmed": 1200,
      "delivered": 1180,
      "cancelled": 47
    },
    "revenue": {
      "totalInCents": 125000000,
      "commission": 12500000,
      "averageOrderValue": 100000
    },
    "riders": {
      "active": 45,
      "online": 23,
      "totalEarnings": 500000
    },
    "customers": {
      "total": 890,
      "newToday": 12,
      "activeToday": 230
    }
  }
}
```

### Revenue Analytics

```bash
GET /api/v1/admin/analytics/revenue
?period=month&restaurantId=rest_1
```

```json
{
  "totalRevenue": 250000000,
  "commission": 25000000,
  "breakdown": {
    "byDay": [
      { "date": "2024-01-20", "amount": 8500000, "orders": 85 },
      { "date": "2024-01-21", "amount": 9200000, "orders": 92 }
    ],
    "byCategory": [
      { "name": "Burgers", "revenue": 120000000, "percentage": 48 },
      { "name": "Pizza", "revenue": 95000000, "percentage": 38 }
    ]
  }
}
```

### Order Analytics

```bash
GET /api/v1/admin/analytics/orders
?period=week
```

```json
{
  "totalOrders": 580,
  "averageOrderValue": 100000,
  "conversionRate": 0.92,
  "statusBreakdown": {
    "confirmed": 480,
    "pending": 23,
    "cancelled": 47,
    "failed": 30
  },
  "peakHours": [
    { "hour": 12, "orders": 95, "avgValue": 105000 },
    { "hour": 19, "orders": 120, "avgValue": 98000 }
  ]
}
```

### Rider Performance

```bash
GET /api/v1/admin/analytics/riders
```

```json
{
  "totalRiders": 156,
  "onlineNow": 34,
  "totalEarnings": 2500000,
  "topRiders": [
    { "id": "rider_1", "name": "Ahmed", "deliveries": 450, "earnings": 90000 },
    { "id": "rider_2", "name": "Ali", "deliveries": 420, "earnings": 84000 }
  ],
  "avgDeliveryTime": 28,  // minutes
  "avgRating": 4.7
}
```

## Implementation

```typescript
@Controller('admin/analytics')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private cacheService: RedisService
  ) {}

  @Get('overview')
  async getOverview(@Query('period') period: 'today' | 'week' | 'month' = 'today') {
    // Check cache
    const cacheKey = `analytics:overview:${period}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Calculate
    const result = await this.analyticsService.getOverview(period);

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, JSON.stringify(result), 3600);

    return result;
  }

  @Get('revenue')
  async getRevenue(
    @Query('period') period: string = 'month',
    @Query('restaurantId') restaurantId?: string
  ) {
    return this.analyticsService.getRevenue(period, restaurantId);
  }

  @Get('orders')
  async getOrders(@Query('period') period: string = 'week') {
    return this.analyticsService.getOrders(period);
  }
}
```

## Metrics Collection

```typescript
@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async recordOrderMetrics(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true }
    });

    // Record metrics in separate table for analysis
    await this.prisma.orderMetric.create({
      data: {
        orderId,
        totalValue: order.totalInCents,
        itemCount: order.items.length,
        paymentStatus: order.payment.status,
        createdAt: order.createdAt
      }
    });
  }
}
```

## Real-Time Metrics

```typescript
// WebSocket for live dashboard
@WebSocketGateway()
export class AnalyticsGateway {
  @SubscribeMessage('subscribe-metrics')
  onSubscribe(client: Socket): void {
    // Send updates every 30 seconds
    setInterval(() => {
      const metrics = this.getLatestMetrics();
      client.emit('metrics-update', metrics);
    }, 30000);
  }
}
```

## Key Metrics

| Metric | Purpose |
|--------|---------|
| AOV (Average Order Value) | Track spending trends |
| Conversion Rate | Customer purchase rate |
| Order Fulfillment Rate | Success percentage |
| Peak Hours | Identify busy times |
| Rider Efficiency | Delivery speed/ratings |
| Customer Retention | Repeat order rate |
| Commission | Platform revenue |

## Best Practices

1. **Cache aggregations** - Run hourly jobs
2. **Use separate schema** - For analytics data
3. **Real-time for critical** - Orders, revenue
4. **Daily reports** - Email admins summaries
5. **Drill-down** - Show detailed breakdowns
6. **Trends** - Compare periods
7. **Alerts** - Notify on anomalies
