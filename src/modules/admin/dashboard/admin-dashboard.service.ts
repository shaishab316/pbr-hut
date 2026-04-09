import { Injectable } from '@nestjs/common';
import { AdminDashboardRepository } from './repositories/dashboard.repository';
import { OrderRepository } from '@/modules/order/repositories/order.repository';
import { QueryOrdersDto } from './dto/query-order.dto';
import { RiderRepository } from '@/modules/rider/repositories/rider.repository';
import { QueryRiderDto } from './dto/query-rider.dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly adminDashboardRepository: AdminDashboardRepository,
    private readonly orderRepository: OrderRepository,
    private readonly riderRepository: RiderRepository,
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

  getAllOrders(params: QueryOrdersDto) {
    return this.orderRepository.getAllOrders(params);
  }

  getAllRiders(params: QueryRiderDto) {
    return this.riderRepository.getAllRiders(params);
  }
}
