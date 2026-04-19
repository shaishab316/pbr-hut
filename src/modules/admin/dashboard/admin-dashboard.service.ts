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

  async generateOrdersCsv(params: QueryOrdersDto): Promise<string> {
    const [orders] = await this.orderRepository.getAllOrders(params);

    // CSV headers
    const headers = [
      'Order Number',
      'Confirmation Code',
      'Customer Name',
      'Customer Email',
      'Order Type',
      'Status',
      'Payment Method',
      'Payment Status',
      'Items Total',
      'Delivery Charge',
      'Taxes',
      'Total Amount',
      'Delivery Address',
      'Phone Number',
      'Delivery Timing',
      'Scheduled At',
      'Estimated Arrival',
      'Delivered At',
      'Created At',
      'Updated At',
    ];

    // Convert orders to CSV rows
    const rows = orders.map((order) => {
      const deliveryAddress = order.deliveryAddress
        ? `${order.deliveryAddress.address}${order.deliveryAddress.buildingDetail ? ', ' + order.deliveryAddress.buildingDetail : ''}`
        : '';

      return [
        this.escapeCsv(order.orderNumber),
        this.escapeCsv(order.confirmationCode),
        this.escapeCsv(order.user?.name || 'N/A'),
        this.escapeCsv(order.user?.email || 'N/A'),
        order.type,
        order.status,
        order.paymentMethod,
        order.paymentStatus,
        order.itemsTotal.toString(),
        order.deliveryCharge.toString(),
        order.taxes.toString(),
        order.totalAmount.toString(),
        this.escapeCsv(deliveryAddress),
        this.escapeCsv(order.deliveryAddress?.phoneNumber || 'N/A'),
        order.deliveryTiming,
        order.scheduledAt?.toISOString() || 'N/A',
        order.estimatedArrivalAt?.toISOString() || 'N/A',
        order.deliveredAt?.toISOString() || 'N/A',
        order.createdAt.toISOString(),
        order.updatedAt.toISOString(),
      ];
    });

    // Combine headers and rows
    const csv =
      [headers, ...rows].map((row) => row.join(',')).join('\n') + '\n';

    return csv;
  }

  private escapeCsv(value: string | null | undefined): string {
    if (!value) return '""';
    if (typeof value !== 'string') value = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
