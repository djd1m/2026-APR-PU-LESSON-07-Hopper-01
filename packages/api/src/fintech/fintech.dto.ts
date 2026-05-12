import { IsUUID, IsIn, IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFreezeDto {
  @ApiProperty({ description: 'Flight ID to freeze the price for' })
  @IsUUID()
  flight_id!: string;

  @ApiPropertyOptional({
    example: 'mir',
    enum: ['mir', 'sbp', 'telegram'],
    description: 'Payment method for freeze fee',
  })
  @IsOptional()
  @IsIn(['mir', 'sbp', 'telegram'])
  payment_method?: string;
}

export class CreateProtectionDto {
  @ApiProperty({ description: 'Booking ID to protect' })
  @IsUUID()
  booking_id!: string;

  @ApiProperty({
    example: ['cancel_for_any_reason', 'price_drop'],
    description: 'Protection types to activate',
  })
  @IsArray()
  @IsString({ each: true })
  types!: string[];
}

export class UseFreezeDto {
  @ApiPropertyOptional({
    example: 'sbp',
    enum: ['mir', 'sbp', 'telegram'],
    description: 'Payment method for booking using freeze',
  })
  @IsOptional()
  @IsIn(['mir', 'sbp', 'telegram'])
  payment_method?: string;
}
