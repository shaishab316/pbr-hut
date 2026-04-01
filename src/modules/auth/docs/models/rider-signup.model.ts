import { ApiProperty } from '@nestjs/swagger';

export class EmailRiderSignUpModel {
  @ApiProperty({ enum: ['email'], example: 'email' })
  identifierType!: 'email';

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'John Doe', minLength: 1, maxLength: 100 })
  name!: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 32 })
  password!: string;

  @ApiProperty({
    example: 23.8103,
    minimum: -90,
    maximum: 90,
    description: 'WGS-84 latitude',
  })
  latitude!: number;

  @ApiProperty({
    example: 90.4125,
    minimum: -180,
    maximum: 180,
    description: 'WGS-84 longitude',
  })
  longitude!: number;
}

export class PhoneRiderSignUpModel {
  @ApiProperty({ enum: ['phone'], example: 'phone' })
  identifierType!: 'phone';

  @ApiProperty({ example: '+8801712345678' })
  phone!: string;

  @ApiProperty({ example: 'John Doe', minLength: 1, maxLength: 100 })
  name!: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 32 })
  password!: string;

  @ApiProperty({
    example: 23.8103,
    minimum: -90,
    maximum: 90,
    description: 'WGS-84 latitude',
  })
  latitude!: number;

  @ApiProperty({
    example: 90.4125,
    minimum: -180,
    maximum: 180,
    description: 'WGS-84 longitude',
  })
  longitude!: number;
}
