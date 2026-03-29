import { ApiProperty } from '@nestjs/swagger';

export class EmailSignUpModel {
  @ApiProperty({ enum: ['email'], example: 'email' })
  identifierType!: 'email';

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'John Doe', minLength: 1, maxLength: 100 })
  name!: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 32 })
  password!: string;
}
