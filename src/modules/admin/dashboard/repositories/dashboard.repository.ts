import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.OUT_FOR_DELIVERY,
];

const COMPLETED_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
];

@Injectable()
export class AdminDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Today window helpers ────────────────────────────────────────────────

  private todayWindow() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // ─── Stats bar ───────────────────────────────────────────────────────────

  async getTodayStats() {
    const { start, end } = this.todayWindow();
    const where = {
      createdAt: { gte: start, lte: end },
    } satisfies Prisma.OrderWhereInput;

    const [
      todayOrderCount,
      todayOrderTotal,
      activeOrderCount,
      pendingCount,
      cancelledCount,
      deliveredCount,
      revenue,
    ] = await this.prisma.$transaction([
      // TODAY ORDERS
      this.prisma.order.count({ where }),

      // ORDER TOTAL (sum of all today's orders)
      this.prisma.order.aggregate({
        where,
        _sum: { totalAmount: true },
      }),

      // ACTIVE ORDERS (all statuses, not date-bound)
      this.prisma.order.count({ where: { status: { in: ACTIVE_STATUSES } } }),

      // PENDING (today)
      this.prisma.order.count({
        where: { ...where, status: OrderStatus.PENDING },
      }),

      // CANCELLED (today)
      this.prisma.order.count({
        where: { ...where, status: OrderStatus.CANCELLED },
      }),

      // DELIVERED (today — DELIVERED + PICKED_UP)
      this.prisma.order.count({
        where: { ...where, status: { in: COMPLETED_STATUSES } },
      }),

      // REVENUE — completed orders only
      this.prisma.order.aggregate({
        where: { ...where, status: { in: COMPLETED_STATUSES } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      todayOrderCount,
      todayOrderTotal:
        todayOrderTotal._sum.totalAmount ?? new Prisma.Decimal(0),
      activeOrderCount,
      pendingCount,
      cancelledCount,
      deliveredCount,
      revenue: revenue._sum.totalAmount ?? new Prisma.Decimal(0),
    };
  }

  // ─── Weekly revenue (Mon → Sun of current week) ──────────────────────────

  async getWeeklyRevenue(): Promise<
    { day: string; revenue: Prisma.Decimal }[]
  > {
    // Get Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Raw query for day-level grouping — avoids 7 separate queries
    const rows = await this.prisma.$queryRaw<
      {
        day: Date;
        revenue: Prisma.Decimal;
      }[]
    >`
      SELECT
        DATE("createdAt") AS day,
        COALESCE(SUM("totalAmount"), 0) AS revenue
      FROM orders
      WHERE "createdAt" >= ${monday}
        AND "createdAt" <= ${sunday}
        AND status IN ('DELIVERED', 'PICKED_UP')
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `;

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Fill in zero-revenue days so the chart always has 7 bars
    return DAYS.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);

      const match = rows.find(
        (r) => new Date(r.day).toISOString().slice(0, 10) === dateStr,
      );
      return {
        day: label,
        revenue: match
          ? new Prisma.Decimal(match.revenue.toString())
          : new Prisma.Decimal(0),
      };
    });
  }

  // ─── Orders by category ───────────────────────────────────────────────────

  async getOrdersByCategory(): Promise<{ category: string; count: number }[]> {
    const rows = await this.prisma.$queryRaw<
      {
        category: string;
        count: number;
      }[]
    >`
      SELECT
        c.name AS category,
        COUNT(DISTINCT o.id) AS count
      FROM orders o
      JOIN order_items oi ON oi."orderId" = o.id
      JOIN items i        ON i.id = oi."itemId"
      JOIN categories c   ON c.id = i."categoryId"
      GROUP BY c.name
      ORDER BY count DESC
    `;

    return rows.map((r) => ({ category: r.category, count: Number(r.count) }));
  }

  // ─── Recent orders ────────────────────────────────────────────────────────

  async getRecentOrders(limit = 10) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    });
  }

  // ─── Top selling items ────────────────────────────────────────────────────

  async getTopSellingItems(
    limit = 10,
  ): Promise<
    { itemName: string; category: string | null; unitsSold: number }[]
  > {
    const rows = await this.prisma.$queryRaw<
      {
        itemName: string;
        category: string | null;
        unitsSold: number;
      }[]
    >`
      SELECT
        oi."itemName",
        c.name AS category,
        SUM(oi.quantity) AS "unitsSold"
      FROM order_items oi
      LEFT JOIN items i    ON i.id = oi."itemId"
      LEFT JOIN categories c ON c.id = i."categoryId"
      GROUP BY oi."itemName", c.name
      ORDER BY "unitsSold" DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      itemName: r.itemName,
      category: r.category,
      unitsSold: Number(r.unitsSold),
    }));
  }
}
