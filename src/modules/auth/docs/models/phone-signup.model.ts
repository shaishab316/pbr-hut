import { ApiProperty } from '@nestjs/swagger';

export class PhoneSignUpModel {
  @ApiProperty({ enum: ['phone'], example: 'phone' })
  identifierType!: 'phone';

  @ApiProperty({ example: '+8801712345678' })
  phone!: string;

  @ApiProperty({ example: 'John Doe', minLength: 1, maxLength: 100 })
  name!: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 32 })
  password!: string;
}
