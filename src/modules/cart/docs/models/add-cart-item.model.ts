import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCartItemRequest {
  @ApiProperty({
    format: 'uuid',
    description: 'Menu item ID',
    example: 'f0f70859-d779-488a-a774-df78b6ec677a',
  })
  itemId!: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 99,
    default: 1,
    description: 'Line quantity',
    example: 1,
  })
  quantity?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Required when the item has size variants',
    example: '78488138-6f81-452c-9a7f-ac2c82cfefc9',
  })
  selectedSizeVariantId?: string | null;

  @ApiProperty({
    format: 'uuid',
    description: 'Side option ID from the item’s `sideOptions`',
    example: '48d24932-838e-4c7e-8c35-e8920afc7fad',
  })
  selectedSideOptionId!: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    description: 'Selected `ItemExtra` IDs for this item',
    example: ['5ac901c2-3cda-416d-ac30-e566675dfa35'],
  })
  extraIds?: string[];

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 500,
    description: 'Only if `allowCustomNote` is true on the item',
    example: 'No onions',
  })
  customNote?: string | null;
}
