import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdsService } from './ads.service';

@Injectable()
export class AdsCron {
  constructor(private readonly adsService: AdsService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async flushClickCounts() {
    await this.adsService.flushClickCounts();
  }
}
