import { BadRequestException } from '@nestjs/common';
import { ContactStrategyFactory } from '../strategies/contact.strategy.factory';

const mockEmailStrategy = { identifierType: 'email' };
const mockPhoneStrategy = { identifierType: 'phone' };

describe('ContactStrategyFactory', () => {
  let factory: ContactStrategyFactory;

  beforeEach(() => {
    factory = new ContactStrategyFactory([
      mockEmailStrategy,
      mockPhoneStrategy,
    ] as any);
  });

  it('should resolve email strategy', () => {
    expect(factory.resolve('email')).toBe(mockEmailStrategy);
  });

  it('should resolve phone strategy', () => {
    expect(factory.resolve('phone')).toBe(mockPhoneStrategy);
  });

  it('should throw on unsupported contact type', () => {
    expect(() => factory.resolve('fax' as any)).toThrow(BadRequestException);
  });
});
