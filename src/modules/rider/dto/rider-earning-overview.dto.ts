export class DailyEarning {
  day!: string;
  earnings!: number;
}

export class RiderEarningOverviewDto {
  totalEarningsThisWeek!: number;
  todayEarning!: number;
  deliveredCount!: number;
  averageIncome!: number;
  dailyBreakdown!: DailyEarning[];
}
