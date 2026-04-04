import { ApiPropertyOptional } from '@nestjs/swagger';

/** Query string for `GET /orders/history` — mirrors `QueryOrderHistoryDto`. */
export class QueryOrderHistoryQueryModel {
  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    example: 1,
    description: '1-based page index',
  })
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
    description: 'Page size',
  })
  limit?: number;
}
