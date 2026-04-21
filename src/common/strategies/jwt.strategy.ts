import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '@/common/config/app.config';

export interface JwtPayload {
  sub: string;
  identifier: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    readonly config: ConfigService<Env, true>,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          // Extract raw token from query parameter ?token=xxx (no Bearer prefix)
          if (req.query?.token) {
            return req.query.token;
          }
          return null;
        },
      ]),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
    this.logger.log(
      'JWT strategy initialized (Bearer header or ?token query param)',
    );
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating JWT payload for user ID: ${payload.sub}`);

    try {
      const user = await this.userRepository.findById(payload.sub);

      if (!user) {
        this.logger.warn(`User not found for ID: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      this.logger.debug(`User ${payload.sub} authenticated successfully`);
      return user; //? attached to req.user
    } catch (error) {
      this.logger.error(
        `JWT validation failed for user ${payload.sub}:`,
        error,
      );
      throw new UnauthorizedException('Invalid token');
    }
  }
}
