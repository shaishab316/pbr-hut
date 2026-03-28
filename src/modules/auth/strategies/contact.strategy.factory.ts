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
    this.strategyMap = new Map(strategies.map((s) => [s.contactType, s]));
  }

  resolve<T extends SignUpInput['contactType']>(
    contactType: T,
  ): IContactStrategy<T> {
    const strategy = this.strategyMap.get(contactType);

    if (!strategy) {
      throw new BadRequestException(`Unsupported contact type: ${contactType}`);
    }

    return strategy as IContactStrategy<T>;
  }
}
