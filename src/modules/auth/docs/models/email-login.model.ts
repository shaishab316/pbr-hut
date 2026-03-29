import { ApiProperty } from '@nestjs/swagger';

export class EmailLoginModel {
  @ApiProperty({ enum: ['email'], example: 'email' })
  identifierType!: 'email';

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 32 })
  password!: string;
}
