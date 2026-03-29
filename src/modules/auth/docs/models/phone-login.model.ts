import { ApiProperty } from '@nestjs/swagger';

export class PhoneLoginModel {
  @ApiProperty({ enum: ['phone'], example: 'phone' })
  identifierType!: 'phone';

  @ApiProperty({ example: '+8801712345678' })
  phone!: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 32 })
  password!: string;
}
