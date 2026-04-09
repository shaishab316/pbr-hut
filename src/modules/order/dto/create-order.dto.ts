import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { DeliveryTiming, OrderType, PaymentMethod } from '@prisma/client';

const DeliveryAddressSchema = z.object({
  locationLabel: z.string().max(200).optional().nullable(),
  name: z.string().min(1).max(120),
  phoneNumber: z.string().min(5).max(32),
  address: z.string().min(1).max(500),
  buildingDetail: z.string().max(200).optional().nullable(),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

const BillingAddressSchema = z.object({
  country: z.string().min(1).max(120),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  suburb: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(20),
  state: z.string().min(1).max(120),
});

export const CreateOrderSchema = z
  .object({
    type: z.nativeEnum(OrderType),
    deliveryTiming: z.nativeEnum(DeliveryTiming).default(DeliveryTiming.NOW),
    scheduledAt: z.coerce.date().optional().nullable(),
    paymentMethod: z.nativeEnum(PaymentMethod),
    deliveryAddress: DeliveryAddressSchema.optional().nullable(),
    billing: BillingAddressSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === OrderType.DELIVERY && !data.deliveryAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery address is required for delivery orders',
        path: ['deliveryAddress'],
      });
    }
    if (data.type === OrderType.PICKUP && data.deliveryAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery address must not be set for pickup orders',
        path: ['deliveryAddress'],
      });
    }
    if (
      data.type === OrderType.DELIVERY &&
      data.paymentMethod === PaymentMethod.CASH_ON_PICKUP
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid payment method for delivery',
        path: ['paymentMethod'],
      });
    }
    if (
      data.type === OrderType.PICKUP &&
      data.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid payment method for pickup',
        path: ['paymentMethod'],
      });
    }
    if (data.paymentMethod === PaymentMethod.CARD && !data.billing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Billing address is required for card payment',
        path: ['billing'],
      });
    }
    if (
      data.deliveryTiming === DeliveryTiming.SCHEDULED &&
      data.scheduledAt == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduledAt is required when delivery timing is SCHEDULED',
        path: ['scheduledAt'],
      });
    }
  });

export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
