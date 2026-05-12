import {
  IsString,
  IsUUID,
  IsArray,
  IsOptional,
  IsIn,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PassengerDto {
  @ApiProperty({ example: 'Ivan', description: 'Passenger first name' })
  @IsString()
  first_name!: string;

  @ApiProperty({ example: 'Ivanov', description: 'Passenger last name' })
  @IsString()
  last_name!: string;

  @ApiProperty({ description: 'Passport number (encrypted on client side)' })
  @IsString()
  passport_number!: string;

  @ApiProperty({ example: '1990-05-15', description: 'Date of birth' })
  @IsDateString()
  date_of_birth!: string;

  @ApiProperty({ example: 'RU', description: 'Citizenship country code' })
  @IsString()
  @Length(2, 2)
  citizenship!: string;
}

export class ProtectionRequestDto {
  @ApiProperty({
    example: 'cancel_for_any_reason',
    enum: ['cancel_for_any_reason', 'price_drop', 'flight_disruption'],
  })
  @IsIn(['cancel_for_any_reason', 'price_drop', 'flight_disruption'])
  type!: string;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Flight ID to book' })
  @IsUUID()
  flight_id!: string;

  @ApiPropertyOptional({ description: 'Price freeze ID to apply' })
  @IsOptional()
  @IsUUID()
  freeze_id?: string;

  @ApiProperty({ type: [PassengerDto], description: 'Passenger details' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers!: PassengerDto[];

  @ApiPropertyOptional({
    type: [ProtectionRequestDto],
    description: 'Requested protections',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProtectionRequestDto)
  protections?: ProtectionRequestDto[];

  @ApiProperty({
    example: 'sbp',
    enum: ['mir', 'sbp', 'telegram'],
    description: 'Payment method',
  })
  @IsIn(['mir', 'sbp', 'telegram'])
  payment_method!: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}
