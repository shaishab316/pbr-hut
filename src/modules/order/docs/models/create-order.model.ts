import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryTiming, OrderType, PaymentMethod } from '@prisma/client';

// ─── Address Models ───────────────────────────────────────────────────────────

export class OrderDeliveryAddressBodyModel {
  @ApiPropertyOptional({
    maxLength: 200,
    example: 'Bir Uttam AK Khandakar Road',
  })
  locationLabel?: string;

  @ApiProperty({ minLength: 1, maxLength: 120, example: 'Harrison Elliot' })
  name!: string;

  @ApiProperty({
    description: 'E.164 international phone number',
    pattern: '^\\+?[1-9]\\d{1,14}$',
    example: '+8801712000000',
  })
  phoneNumber!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 500,
    example: '49 Bir Uttam AK Khandakar Rd, Dhaka 1212',
  })
  address!: string;

  @ApiPropertyOptional({ maxLength: 200, example: 'Apt 4B' })
  buildingDetail?: string;

  @ApiProperty({ minimum: -90, maximum: 90, example: 23.8103 })
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: 90.4125 })
  longitude!: number;
}

export class OrderBillingAddressBodyModel {
  @ApiProperty({ maxLength: 120, example: 'Bangladesh' })
  country!: string;

  @ApiProperty({ maxLength: 200, example: '49 Bir Uttam AK Khandakar Rd' })
  addressLine1!: string;

  @ApiPropertyOptional({ maxLength: 200, nullable: true, example: null })
  addressLine2?: string | null;

  @ApiProperty({ maxLength: 120, example: 'Gulshan' })
  suburb!: string;

  @ApiProperty({ maxLength: 120, example: 'Dhaka' })
  city!: string;

  @ApiProperty({ maxLength: 20, example: '1212' })
  postalCode!: string;

  @ApiProperty({ maxLength: 120, example: 'Dhaka Division' })
  state!: string;
}

// ─── Timing Mixin Models ──────────────────────────────────────────────────────

class NowTimingModel {
  @ApiProperty({ enum: [DeliveryTiming.NOW], default: DeliveryTiming.NOW })
  deliveryTiming!: typeof DeliveryTiming.NOW;

  @ApiPropertyOptional({
    description: 'Ignored when deliveryTiming is NOW',
    format: 'date-time',
    nullable: true,
  })
  scheduledAt?: string | null;
}

class ScheduledTimingModel {
  @ApiProperty({ enum: [DeliveryTiming.SCHEDULED] })
  deliveryTiming!: typeof DeliveryTiming.SCHEDULED;

  @ApiProperty({
    description: 'Required when deliveryTiming is SCHEDULED (ISO-8601)',
    format: 'date-time',
    example: '2025-04-15T14:00:00.000Z',
  })
  scheduledAt!: string;
}

// ─── Branch Models ────────────────────────────────────────────────────────────
// One class per (type × paymentMethod × timing) combination that is valid.
// Swagger oneOf references these, giving accurate per-branch docs.

// DELIVERY + CASH_ON_DELIVERY
export class DeliveryOrderCashModel extends NowTimingModel {
  @ApiProperty({ enum: [OrderType.DELIVERY] })
  type!: typeof OrderType.DELIVERY;

  @ApiProperty({ enum: [PaymentMethod.CASH_ON_DELIVERY] })
  paymentMethod!: typeof PaymentMethod.CASH_ON_DELIVERY;

  @ApiProperty({ type: OrderDeliveryAddressBodyModel })
  deliveryAddress!: OrderDeliveryAddressBodyModel;

  @ApiPropertyOptional({
    type: OrderBillingAddressBodyModel,
    nullable: true,
    description: 'Optional for cash orders',
  })
  billing?: OrderBillingAddressBodyModel | null;
}

// DELIVERY + CARD (billing required)
export class DeliveryOrderCardModel extends NowTimingModel {
  @ApiProperty({ enum: [OrderType.DELIVERY] })
  type!: typeof OrderType.DELIVERY;

  @ApiProperty({ enum: [PaymentMethod.CARD] })
  paymentMethod!: typeof PaymentMethod.CARD;

  @ApiProperty({ type: OrderDeliveryAddressBodyModel })
  deliveryAddress!: OrderDeliveryAddressBodyModel;

  @ApiProperty({
    type: OrderBillingAddressBodyModel,
    description: 'Required for CARD payment',
  })
  billing!: OrderBillingAddressBodyModel;
}

// PICKUP + CASH_ON_PICKUP (no deliveryAddress)
export class PickupOrderCashModel extends NowTimingModel {
  @ApiProperty({ enum: [OrderType.PICKUP] })
  type!: typeof OrderType.PICKUP;

  @ApiProperty({ enum: [PaymentMethod.CASH_ON_PICKUP] })
  paymentMethod!: typeof PaymentMethod.CASH_ON_PICKUP;
}

// PICKUP + CARD (no deliveryAddress, billing required)
export class PickupOrderCardModel extends NowTimingModel {
  @ApiProperty({ enum: [OrderType.PICKUP] })
  type!: typeof OrderType.PICKUP;

  @ApiProperty({ enum: [PaymentMethod.CARD] })
  paymentMethod!: typeof PaymentMethod.CARD;

  @ApiProperty({
    type: OrderBillingAddressBodyModel,
    description: 'Required for CARD payment',
  })
  billing!: OrderBillingAddressBodyModel;
}

// Scheduled variants (scheduledAt required)
export class DeliveryOrderCashScheduledModel extends ScheduledTimingModel {
  @ApiProperty({ enum: [OrderType.DELIVERY] })
  type!: typeof OrderType.DELIVERY;

  @ApiProperty({ enum: [PaymentMethod.CASH_ON_DELIVERY] })
  paymentMethod!: typeof PaymentMethod.CASH_ON_DELIVERY;

  @ApiProperty({ type: OrderDeliveryAddressBodyModel })
  deliveryAddress!: OrderDeliveryAddressBodyModel;

  @ApiPropertyOptional({ type: OrderBillingAddressBodyModel, nullable: true })
  billing?: OrderBillingAddressBodyModel | null;
}

export class DeliveryOrderCardScheduledModel extends ScheduledTimingModel {
  @ApiProperty({ enum: [OrderType.DELIVERY] })
  type!: typeof OrderType.DELIVERY;

  @ApiProperty({ enum: [PaymentMethod.CARD] })
  paymentMethod!: typeof PaymentMethod.CARD;

  @ApiProperty({ type: OrderDeliveryAddressBodyModel })
  deliveryAddress!: OrderDeliveryAddressBodyModel;

  @ApiProperty({ type: OrderBillingAddressBodyModel })
  billing!: OrderBillingAddressBodyModel;
}

// ─── Aggregate (for ApiExtraModels registration only) ─────────────────────────
// Not used as ApiBody type — the decorator uses schema.oneOf directly.

export class CreateOrderRequestModel {}
