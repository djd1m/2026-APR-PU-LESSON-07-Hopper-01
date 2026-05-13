import {
  IsString,
  IsDateString,
  IsPositive,
  IsIn,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const SUPPORTED_AIRPORT_CODES = [
  'SVO', 'DME', 'VKO', 'LED', 'AER', 'KRR', 'SVX', 'OVB',
  'ROV', 'KZN', 'UFA', 'VOG', 'KGD', 'MRV', 'AAQ', 'IKT',
  'KHV', 'VVO', 'TJM', 'CEK',
];

export class CreateAlertDto {
  @ApiProperty({ example: 'SVO', description: 'Origin airport IATA code' })
  @IsString()
  @IsIn(SUPPORTED_AIRPORT_CODES, {
    message: 'Origin must be a supported Russian airport code',
  })
  origin!: string;

  @ApiProperty({ example: 'AER', description: 'Destination airport IATA code' })
  @IsString()
  @IsIn(SUPPORTED_AIRPORT_CODES, {
    message: 'Destination must be a supported Russian airport code',
  })
  destination!: string;

  @ApiProperty({
    example: '2026-07-15',
    description: 'Departure date (YYYY-MM-DD)',
  })
  @IsDateString()
  departure_date!: string;

  @ApiProperty({
    example: 9000,
    description: 'Target price in RUB (positive number)',
  })
  @IsNumber()
  @IsPositive()
  target_price!: number;
}

export class AlertResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'SVO' })
  origin!: string;

  @ApiProperty({ example: 'AER' })
  destination!: string;

  @ApiProperty({ example: '2026-07-15' })
  departure_date!: string;

  @ApiProperty({ example: 9000 })
  target_price!: number;

  @ApiProperty({ example: 12000 })
  current_price!: number;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'TRIGGERED', 'EXPIRED'] })
  status!: string;

  @ApiProperty({ example: '2026-05-12T10:00:00.000Z' })
  created_at!: string;
}
