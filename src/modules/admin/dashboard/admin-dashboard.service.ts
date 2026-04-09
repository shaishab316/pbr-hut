import { Injectable } from '@nestjs/common';
import { AdminDashboardRepository } from './repositories/dashboard.repository';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly adminDashboardRepository: AdminDashboardRepository,
  ) {}

  async getSummary() {
    const [stats, weeklyRevenue, ordersByCategory, recentOrders, topItems] =
      await Promise.all([
        this.adminDashboardRepository.getTodayStats(),
        this.adminDashboardRepository.getWeeklyRevenue(),
        this.adminDashboardRepository.getOrdersByCategory(),
        this.adminDashboardRepository.getRecentOrders(10),
        this.adminDashboardRepository.getTopSellingItems(10),
      ]);

    return {
      message: 'Success',
      data: {
        stats: {
          todayOrders: stats.todayOrderCount,
          orderTotal: stats.todayOrderTotal,
          activeOrders: stats.activeOrderCount,
          pending: stats.pendingCount,
          cancelled: stats.cancelledCount,
          delivered: stats.deliveredCount,
          revenue: stats.revenue,
        },
        weeklyRevenue,
        ordersByCategory,
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.user.name ?? o.user.email ?? 'Unknown',
          itemsQty: o._count.items,
          orderTotal: o.totalAmount,
          status: o.status,
          time: o.createdAt,
        })),
        topSellingItems: topItems,
      },
    };
  }
}
