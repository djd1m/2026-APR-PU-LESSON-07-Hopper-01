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
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PassengerDto {
  @ApiProperty({ example: 'Иван', description: 'Passenger first name' })
  @IsString()
  first_name!: string;

  @ApiProperty({ example: 'Иванов', description: 'Passenger last name' })
  @IsString()
  last_name!: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Passport number (10 digits)',
  })
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'Некорректный номер паспорта. Ожидается 10 цифр.',
  })
  passport_number!: string;

  @ApiProperty({ example: '1990-05-15', description: 'Date of birth' })
  @IsDateString()
  date_of_birth!: string;

  @ApiProperty({ example: 'RU', description: 'Nationality country code' })
  @IsString()
  @Length(2, 2)
  nationality!: string;
}

export class ProtectionRequestDto {
  @ApiProperty({
    example: 'cancel_for_any_reason',
    enum: ['cancel_for_any_reason', 'price_drop', 'price_freeze'],
  })
  @IsIn(['cancel_for_any_reason', 'price_drop', 'price_freeze'])
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

// ─── Response DTOs ───────────────────────────────────────

export class MoneyDto {
  amount!: number;
  currency!: string;
}

export class ProtectionResponseDto {
  type!: string;
  status!: string;
  premium!: MoneyDto;
  coverage!: MoneyDto;
  valid_until?: string;
}

export class PassengerResponseDto {
  first_name!: string;
  last_name!: string;
  passport_number!: string;
  date_of_birth!: string;
  nationality!: string;
}

export class FlightItemResponseDto {
  id!: string;
  airline!: string;
  flight_number!: string;
  origin!: string;
  destination!: string;
  departure_at!: string;
  arrival_at!: string;
  price!: MoneyDto;
}

export class BookingResponseDto {
  id!: string;
  status!: string;
  pnr!: string | null;
  total_price!: MoneyDto;
  breakdown!: {
    flight: MoneyDto;
    protections: MoneyDto;
  };
  flights!: FlightItemResponseDto[];
  passengers!: PassengerResponseDto[];
  protections!: ProtectionResponseDto[];
  created_at!: string;
  confirmed_at!: string | null;
}

export class CancelBookingResponseDto {
  booking_id!: string;
  status!: string;
  refund_amount!: MoneyDto;
  refund_method!: string;
  processing_days!: number;
  cfar_used!: boolean;
  cancelled_at!: string;
}
