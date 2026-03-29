import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { SignUpInput } from '../dto/sign-up.dto';
import {
  CONTACT_STRATEGIES,
  IContactStrategy,
} from './contact.strategy.interface';

@Injectable()
export class ContactStrategyFactory {
  private readonly strategyMap: Map<string, IContactStrategy<any>>;

  constructor(@Inject(CONTACT_STRATEGIES) strategies: IContactStrategy[]) {
    this.strategyMap = new Map(strategies.map((s) => [s.identifierType, s]));
  }

  resolve<T extends SignUpInput['identifierType']>(
    identifierType: T,
  ): IContactStrategy<T> {
    const strategy = this.strategyMap.get(identifierType);

    if (!strategy) {
      throw new BadRequestException(
        `Unsupported contact type: ${identifierType}`,
      );
    }

    return strategy as IContactStrategy<T>;
  }
}
