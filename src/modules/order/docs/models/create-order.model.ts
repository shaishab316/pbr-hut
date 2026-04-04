import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DeliveryTiming,
  OrderType,
  PaymentMethod,
} from '@prisma/client';

/** Request body for `POST /orders` — mirrors validation in `CreateOrderDto` (Zod). */
export class OrderDeliveryAddressBodyModel {
  @ApiPropertyOptional({
    example: 'Bir Uttam AK Khandakar Road',
    description: 'Short map / street label shown above the pin',
  })
  locationLabel?: string | null;

  @ApiProperty({ example: 'Harrison Elliot' })
  name!: string;

  @ApiProperty({ example: '+8801712000000' })
  phoneNumber!: string;

  @ApiProperty({
    example: '49 Bir Uttam AK Khandakar Rd, Dhaka 1212',
  })
  address!: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  buildingDetail?: string | null;

  @ApiPropertyOptional({ example: 23.8103 })
  latitude?: number | null;

  @ApiPropertyOptional({ example: 90.4125 })
  longitude?: number | null;
}

export class OrderBillingAddressBodyModel {
  @ApiProperty({ example: 'Bangladesh' })
  country!: string;

  @ApiProperty({ example: '49 Bir Uttam AK Khandakar Rd' })
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Building A' })
  addressLine2?: string | null;

  @ApiProperty({ example: 'Gulshan' })
  suburb!: string;

  @ApiProperty({ example: 'Dhaka' })
  city!: string;

  @ApiProperty({ example: '1212' })
  postalCode!: string;

  @ApiProperty({ example: 'Dhaka Division' })
  state!: string;
}

export class CreateOrderRequestModel {
  @ApiProperty({
    enum: OrderType,
    enumName: 'OrderType',
    example: OrderType.DELIVERY,
    description: '`DELIVERY` requires `deliveryAddress`; `PICKUP` must omit it.',
  })
  type!: OrderType;

  @ApiProperty({
    enum: DeliveryTiming,
    enumName: 'DeliveryTiming',
    example: DeliveryTiming.NOW,
    default: DeliveryTiming.NOW,
  })
  deliveryTiming!: DeliveryTiming;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Required when `deliveryTiming` is `SCHEDULED`',
    example: '2026-04-04T18:30:00.000Z',
  })
  scheduledAt?: Date | null;

  @ApiProperty({
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    example: PaymentMethod.CASH_ON_DELIVERY,
    description:
      'Use `CASH_ON_DELIVERY` for delivery, `CASH_ON_PICKUP` for pickup, `CARD` for pay-now (billing required).',
  })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    type: OrderDeliveryAddressBodyModel,
    description: 'Required when `type` is `DELIVERY`',
  })
  deliveryAddress?: OrderDeliveryAddressBodyModel | null;

  @ApiPropertyOptional({
    type: OrderBillingAddressBodyModel,
    description: 'Required when `paymentMethod` is `CARD`',
  })
  billing?: OrderBillingAddressBodyModel | null;
}
