import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

@Injectable()
export class AuthCron {
  private readonly logger = new Logger(AuthCron.name);

  constructor(private readonly authService: AuthService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpiredRefreshTokens() {
    try {
      this.logger.debug('Starting deletion of expired refresh tokens...');
      await this.authService.deleteExpiredRefreshTokens();
      this.logger.debug('Expired refresh tokens deleted successfully');
    } catch (error) {
      this.logger.error(
        'Failed to delete expired refresh tokens',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
