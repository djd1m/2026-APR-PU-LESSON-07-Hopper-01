import {
  IsString,
  IsDateString,
  IsNumber,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PredictRequestDto {
  @ApiProperty({ example: 'SVO', description: 'Origin airport IATA code' })
  @IsString()
  @Length(2, 4)
  origin: string;

  @ApiProperty({ example: 'AER', description: 'Destination airport IATA code' })
  @IsString()
  @Length(2, 4)
  destination: string;

  @ApiProperty({ example: '2026-07-15', description: 'Departure date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 8500, description: 'Current observed price in RUB' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  current_price: number;
}

export class PredictionFactorDto {
  @ApiProperty({ example: 'advance_purchase' })
  name: string;

  @ApiProperty({ example: 0.3 })
  weight: number;

  @ApiProperty({ example: 'UP' })
  direction: string;

  @ApiProperty({ example: '7-21_days' })
  value?: string;
}

export class PredictionResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      origin: { type: 'string', example: 'SVO' },
      destination: { type: 'string', example: 'AER' },
    },
  })
  route: { origin: string; destination: string };

  @ApiProperty({ example: '2026-07-15' })
  departure_date: string;

  @ApiProperty({
    type: 'object',
    properties: {
      amount: { type: 'number', example: 8500 },
      currency: { type: 'string', example: 'RUB' },
    },
  })
  current_price: { amount: number; currency: string };

  @ApiProperty({ enum: ['BUY_NOW', 'WAIT', 'INSUFFICIENT_DATA'] })
  action: 'BUY_NOW' | 'WAIT' | 'INSUFFICIENT_DATA';

  @ApiProperty({ example: 0.68 })
  confidence: number;

  @ApiProperty({ enum: ['UP', 'DOWN', 'STABLE'] })
  direction: 'UP' | 'DOWN' | 'STABLE';

  @ApiProperty({ example: 12.5 })
  predicted_change_pct: number;

  @ApiProperty({ example: 9562.5 })
  predicted_price: number;

  @ApiProperty({ example: 'Рекомендуем купить сейчас (уверенность 68%): ...' })
  explanation: string;

  @ApiProperty({
    type: 'object',
    nullable: true,
    properties: {
      amount: { type: 'number' },
      currency: { type: 'string' },
    },
  })
  expected_savings: { amount: number; currency: string } | null;

  @ApiProperty({ nullable: true, example: null })
  wait_days: number | null;

  @ApiProperty({ example: 'rule-v1' })
  model_version: string;

  @ApiProperty({ type: [PredictionFactorDto] })
  factors: PredictionFactorDto[];
}
