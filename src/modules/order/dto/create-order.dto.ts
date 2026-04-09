import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { DeliveryTiming, OrderType, PaymentMethod } from '@prisma/client';

// ─── Address Schemas ──────────────────────────────────────────────────────────

const DeliveryAddressSchema = z.object({
  locationLabel: z
    .string('Location Label is required')
    .max(200, 'Location Label must be at most 200 characters')
    .optional(),
  name: z.string('Name is required').min(1, 'Name is required').max(120),
  phoneNumber: z.string('Phone Number is required').refine(
    (val) => /^\+?[1-9]\d{1,14}$/.test(val), // E.164 format
    'Phone Number must be a valid international number',
  ),
  address: z
    .string('Address is required')
    .min(1, 'Address is required')
    .max(500, 'Address must be at most 500 characters'),
  buildingDetail: z
    .string('Building Detail is required')
    .max(200, 'Building Detail must be at most 200 characters')
    .optional(),
  latitude: z.coerce
    .number('Latitude is required')
    .min(-90, 'Latitude must be at least -90')
    .max(90, 'Latitude must be at most 90'),
  longitude: z.coerce
    .number('Longitude is required')
    .min(-180, 'Longitude must be at least -180')
    .max(180, 'Longitude must be at most 180'),
});

const BillingAddressSchema = z.object({
  country: z
    .string('Country is required')
    .min(1, 'Country is required')
    .max(120, 'Country must be at most 120 characters'),
  addressLine1: z
    .string('Address Line 1 is required')
    .min(1, 'Address Line 1 is required')
    .max(200, 'Address Line 1 must be at most 200 characters'),
  addressLine2: z
    .string('Address Line 2 is optional')
    .max(200, 'Address Line 2 must be at most 200 characters')
    .optional(),
  suburb: z
    .string('Suburb is required')
    .min(1, 'Suburb is required')
    .max(120, 'Suburb must be at most 120 characters'),
  city: z
    .string('City is required')
    .min(1, 'City is required')
    .max(120, 'City must be at most 120 characters'),
  postalCode: z
    .string('Postal Code is required')
    .min(1, 'Postal Code is required')
    .max(20, 'Postal Code must be at most 20 characters'),
  state: z
    .string('State is required')
    .min(1, 'State is required')
    .max(120, 'State must be at most 120 characters'),
});

// ─── Timing Variant ───────────────────────────────────────────────────────────
// discriminates: scheduledAt required iff SCHEDULED

const NowTimingSchema = z.object({
  deliveryTiming: z.literal(DeliveryTiming.NOW).default(DeliveryTiming.NOW),
  scheduledAt: z.coerce.date().optional(),
});

const ScheduledTimingSchema = z.object({
  deliveryTiming: z.literal(DeliveryTiming.SCHEDULED),
  scheduledAt: z.iso.datetime(),
});

const TimingVariantSchema = z.discriminatedUnion('deliveryTiming', [
  NowTimingSchema,
  ScheduledTimingSchema,
]);

// ─── Payment Variants ─────────────────────────────────────────────────────────
// discriminates: billing required iff CARD

const CardPaymentSchema = z.object({
  paymentMethod: z.literal(PaymentMethod.CARD),
  billing: BillingAddressSchema, // required
});

const CashOnDeliverySchema = z.object({
  paymentMethod: z.literal(PaymentMethod.CASH_ON_DELIVERY),
  billing: BillingAddressSchema.optional(),
});

const CashOnPickupSchema = z.object({
  paymentMethod: z.literal(PaymentMethod.CASH_ON_PICKUP),
  billing: BillingAddressSchema.optional(),
});

// ─── Order Type Variants ──────────────────────────────────────────────────────
// DELIVERY → deliveryAddress required, payment limited to CARD | CASH_ON_DELIVERY
// PICKUP   → deliveryAddress absent,   payment limited to CARD | CASH_ON_PICKUP

const DeliveryOrderSchema = z
  .object({
    type: z.literal(OrderType.DELIVERY),
    deliveryAddress: DeliveryAddressSchema, // required
  })
  .and(
    z.discriminatedUnion('paymentMethod', [
      CardPaymentSchema,
      CashOnDeliverySchema,
    ]),
  );

const PickupOrderSchema = z
  .object({
    type: z.literal(OrderType.PICKUP),
    // deliveryAddress intentionally absent — not even optional
  })
  .and(
    z.discriminatedUnion('paymentMethod', [
      CardPaymentSchema,
      CashOnPickupSchema,
    ]),
  );

// ─── Final Schema ─────────────────────────────────────────────────────────────
// z.union (not discriminatedUnion) because branches are intersections, not plain objects.
// TypeScript inference still narrows correctly on `type`.

export const CreateOrderSchema = z
  .union([DeliveryOrderSchema, PickupOrderSchema])
  .and(TimingVariantSchema);

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export class CreateOrderDto extends createZodDto(
  CreateOrderSchema as unknown as z.ZodType<object>,
) {}
