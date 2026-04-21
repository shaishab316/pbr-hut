# Rider Dispatch and H3 Geospatial

Efficient rider dispatch using Uber's H3 hexagonal grid indexing for O(1) proximity lookups.

## H3 Overview

H3 divides the world into hexagonal cells at different resolutions:

```
Resolution 0: 122 cells covering Earth
Resolution 1: 842 cells
...
Resolution 15: 700 trillion cells (very precise)
```

## Implementation

```typescript
import h3 from 'h3-js';

// Get H3 index for coordinates
const h3Index = h3.latLngToCell(24.2389, 73.1734, 10);  // Resolution 10

// Get cell boundaries
const boundary = h3.cellToBoundary(h3Index);

// Get nearby cells
const neighbors = h3.gridDisk(h3Index, 1);  // 1-ring around cell

// Find cells in radius
const cellsInRadius = h3.polygonToCells(polygon, 10);
```

## Geospatial Schema

```prisma
model RiderProfile {
  id              String   @id
  userId          String
  locationH3      String   // H3 index at resolution 10
  latitude        Float
  longitude       Float
  isAvailable     Boolean
  currentOrderId  String?
  
  @@index([locationH3])      // Fast proximity lookups
}

model Order {
  id              String   @id
  deliveryH3      String   // Destination H3 index
  riderId         String?
}
```

## Finding Nearest Riders

```typescript
async findNearestRiders(
  deliveryLat: number,
  deliveryLng: number
): Promise<RiderProfile[]> {
  // Get H3 cell for delivery location
  const targetH3 = h3.latLngToCell(deliveryLat, deliveryLng, 10);
  
  // Get surrounding cells (expanding rings)
  const rings: string[] = [];
  for (let ring = 0; ring <= 3; ring++) {
    const cellsInRing = h3.gridDisk(targetH3, ring);
    rings.push(...cellsInRing);
  }

  // Query all riders in these cells
  const riders = await this.prisma.riderProfile.findMany({
    where: {
      locationH3: { in: rings },
      isAvailable: true,
      currentOrderId: null
    }
  });

  // Sort by distance
  return riders.sort((a, b) => {
    const distA = this.haversineDistance(
      deliveryLat, deliveryLng,
      a.latitude, a.longitude
    );
    const distB = this.haversineDistance(
      deliveryLat, deliveryLng,
      b.latitude, b.longitude
    );
    return distA - distB;
  });
}
```

## Rider Availability

```typescript
@Patch('riders/:id/location')
@UseGuards(JwtGuard, RolesGuard)
@Roles('RIDER')
updateRiderLocation(
  @Param('id') id: string,
  @Body() dto: { latitude: number; longitude: number }
) {
  const h3Index = h3.latLngToCell(dto.latitude, dto.longitude, 10);
  
  return this.prisma.riderProfile.update({
    where: { id },
    data: {
      latitude: dto.latitude,
      longitude: dto.longitude,
      locationH3: h3Index
    }
  });
}
```

## Haversine Distance

```typescript
haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;  // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

## Dispatch Algorithm

```typescript
async dispatchOrder(orderId: string): Promise<void> {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId }
  });

  // Find nearby available riders
  const riders = await this.findNearestRiders(
    order.shippingAddress.latitude,
    order.shippingAddress.longitude
  );

  if (riders.length === 0) {
    // No riders available - queue for retry
    await this.redisService.lpush(`pending:orders`, orderId);
    return;
  }

  // Assign to nearest rider
  const rider = riders[0];
  
  await this.prisma.order.update({
    where: { id: orderId },
    data: { riderId: rider.userId }
  });

  // Notify rider
  await this.notificationService.notifyRider(
    rider.userId,
    `New delivery: $${order.totalInCents / 100}`
  );
}
```

## ETA Calculation

```typescript
calculateETA(
  ridersLat: number, ridersLng: number,
  deliveryLat: number, deliveryLng: number
): number {
  const distanceKm = this.haversineDistance(
    ridersLat, ridersLng,
    deliveryLat, deliveryLng
  );
  
  const avgSpeedKmh = 20;  // Average delivery speed
  const timeMinutes = (distanceKm / avgSpeedKmh) * 60;
  
  return Math.ceil(timeMinutes);
}
```

## Benefits

1. **O(1) lookup** - Hexagonal grid indexing
2. **Scalable** - Works for millions of riders
3. **Accurate** - Hexagons approximate circular radius
4. **Efficient** - No polygon calculations
5. **Database** - Index on H3 columns

## Limitations

- Hexagons don't perfectly match circles
- Resolution choice matters (too coarse = inaccurate, too fine = slow)
- Real-time updates needed as riders move

## Best Practices

1. **Use resolution 10-12** - Balances accuracy and performance
2. **Update location frequently** - Every 1-2 minutes
3. **Use caching** - H3 calculations are fast but cacheable
4. **Monitor H3 distribution** - Ensure even cell coverage
5. **Test with real data** - Verify performance with your rider count
