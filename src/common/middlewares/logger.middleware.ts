import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import chalk from 'chalk';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      this.logger.log(
        `${chalk.cyan(method)} ${chalk.white(originalUrl)} ${chalk.green(statusCode)} ${chalk.yellow('+' + duration + 'ms')}`,
      );
    });

    next();
  }
}
