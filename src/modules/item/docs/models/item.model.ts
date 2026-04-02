import { ApiProperty } from '@nestjs/swagger';
import { Size } from '@prisma/client';

// ─── Nested Models ─────────────────────────────────────────────────────────────

export class SizeVariantModel {
  @ApiProperty({
    enum: Size,
    example: Size.SMALL,
  })
  size!: Size;

  @ApiProperty({ example: 8.0 })
  price!: number;
}

export class SideOptionModel {
  @ApiProperty({ example: 'Cajun Fries' })
  name!: string;

  @ApiProperty({ example: 0.0 })
  price!: number;

  @ApiProperty({
    example: false,
    description: 'Only one side option can be true',
  })
  isDefault!: boolean;
}

export class ItemExtraModel {
  @ApiProperty({ example: 'Black Olives' })
  name!: string;

  @ApiProperty({ example: 2.0 })
  price!: number;
}

// ─── Flat (bracket notation) ───────────────────────────────────────────────────

export class FlatCreateItemModel {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'JPEG / PNG / WEBP, max 2MB',
  })
  image!: Express.Multer.File;

  @ApiProperty({
    example: 'Classic Margherita',
    description: 'Max 80 characters',
  })
  name!: string;

  @ApiProperty({
    example: 'Slow-smoked for 12 hours over hickory wood...',
    description: 'Max 300 characters',
  })
  description!: string;

  @ApiProperty({
    example: 1,
    description: 'Lower = appears first. Default 0',
    required: false,
  })
  displayOrder?: number;

  @ApiProperty({ example: true, description: 'Default true', required: false })
  isDeliverable?: boolean;

  @ApiProperty({ example: true, description: 'Default true', required: false })
  isAvailable?: boolean;

  @ApiProperty({
    example: true,
    description: 'Show customer note textarea. Default true',
    required: false,
  })
  allowCustomNote?: boolean;

  @ApiProperty({
    example: false,
    description: 'FREE badge on sides section. Default false',
    required: false,
  })
  isSideFree?: boolean;

  @ApiProperty({
    example: true,
    description: 'Optional badge on extras section. Default true',
    required: false,
  })
  isExtrasOptional?: boolean;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  categoryId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    required: false,
    description: 'Must belong to categoryId',
  })
  subCategoryId?: string;

  @ApiProperty({
    description: 'Repeat per tag: tagIds[0], tagIds[1]...',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
    name: 'tagIds[0]',
  })
  'tagIds[0]'?: string;

  @ApiProperty({
    description:
      'Repeat per size: sizeVariants[0][size], sizeVariants[1][size]...',
    enum: Size,
    example: Size.SMALL,
    name: 'sizeVariants[0][size]',
  })
  'sizeVariants[0][size]'!: Size;

  @ApiProperty({
    description: 'Repeat per size: sizeVariants[0][price]...',
    example: 8.0,
    name: 'sizeVariants[0][price]',
  })
  'sizeVariants[0][price]'!: number;

  @ApiProperty({
    description: 'Repeat per side: sideOptions[0][name]...',
    example: 'Cajun Fries',
    name: 'sideOptions[0][name]',
  })
  'sideOptions[0][name]'!: string;

  @ApiProperty({
    description: 'Repeat per side: sideOptions[0][price]...',
    example: 0.0,
    name: 'sideOptions[0][price]',
  })
  'sideOptions[0][price]'!: number;

  @ApiProperty({
    description: 'Only one true allowed: sideOptions[0][isDefault]...',
    example: false,
    name: 'sideOptions[0][isDefault]',
  })
  'sideOptions[0][isDefault]'!: boolean;

  @ApiProperty({
    description: 'Optional. Repeat per extra: extras[0][name]...',
    example: 'Black Olives',
    required: false,
    name: 'extras[0][name]',
  })
  'extras[0][name]'?: string;

  @ApiProperty({
    description: 'Repeat per extra: extras[0][price]...',
    example: 2.0,
    required: false,
    name: 'extras[0][price]',
  })
  'extras[0][price]'?: number;
}

// ─── JSON data field ───────────────────────────────────────────────────────────

export class JsonCreateItemPayloadModel {
  @ApiProperty({
    example: 'Classic Margherita',
    description: 'Max 80 characters',
  })
  name!: string;

  @ApiProperty({
    example: 'Slow-smoked for 12 hours over hickory wood...',
    description: 'Max 300 characters',
  })
  description!: string;

  @ApiProperty({ example: 1, required: false })
  displayOrder?: number;

  @ApiProperty({ example: true, required: false })
  isDeliverable?: boolean;

  @ApiProperty({ example: true, required: false })
  isAvailable?: boolean;

  @ApiProperty({ example: true, required: false })
  allowCustomNote?: boolean;

  @ApiProperty({ example: false, required: false })
  isSideFree?: boolean;

  @ApiProperty({ example: true, required: false })
  isExtrasOptional?: boolean;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  categoryId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    required: false,
  })
  subCategoryId?: string;

  @ApiProperty({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440002'],
    required: false,
  })
  tagIds?: string[];

  @ApiProperty({ type: [SizeVariantModel] })
  sizeVariants!: SizeVariantModel[];

  @ApiProperty({ type: [SideOptionModel] })
  sideOptions!: SideOptionModel[];

  @ApiProperty({ type: [ItemExtraModel], required: false })
  extras?: ItemExtraModel[];
}

export class JsonCreateItemModel {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'JPEG / PNG / WEBP, max 2MB',
  })
  image!: Express.Multer.File;

  @ApiProperty({
    type: 'string',
    description: 'Full item payload as a JSON string',
    example: JSON.stringify({
      name: 'Classic Margherita',
      description: 'Slow-smoked for 12 hours over hickory wood...',
      displayOrder: 1,
      isDeliverable: true,
      isAvailable: true,
      allowCustomNote: true,
      isSideFree: true,
      isExtrasOptional: true,
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      subCategoryId: '550e8400-e29b-41d4-a716-446655440001',
      tagIds: ['550e8400-e29b-41d4-a716-446655440002'],
      sizeVariants: [
        { size: Size.SMALL, price: 8.0 },
        { size: Size.MEDIUM, price: 16.0 },
        { size: Size.LARGE, price: 19.0 },
        { size: Size.REGULAR, price: 14.5 },
      ],
      sideOptions: [
        { name: 'Cajun Fries', price: 0.0, isDefault: false },
        { name: 'House Salad', price: 0.0, isDefault: false },
        { name: 'Buttered Corn', price: 0.0, isDefault: true },
      ],
      extras: [
        { name: 'Extra Bourbon Sauce', price: 2.0 },
        { name: 'Black Olives', price: 2.0 },
      ],
    }),
  })
  data!: string;
}
