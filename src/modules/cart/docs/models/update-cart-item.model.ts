import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCartItemRequest {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 99,
    description: 'New quantity for this line',
    example: 3,
  })
  quantity?: number;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 500,
    description: 'Updated note, or null to clear the note',
    example: 'Extra sauce',
  })
  customNote?: string | null;
}
