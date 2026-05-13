import {
  IsString,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const SUPPORTED_AIRPORT_CODES = [
  'SVO', 'DME', 'VKO', 'LED', 'AER', 'KRR', 'SVX', 'OVB',
  'ROV', 'KZN', 'UFA', 'VOG', 'KGD', 'MRV', 'AAQ', 'IKT',
  'KHV', 'VVO', 'TJM', 'CEK',
];

export class SearchFlightsDto {
  @ApiProperty({ example: 'SVO', description: 'Origin airport IATA code' })
  @IsString()
  @IsIn(SUPPORTED_AIRPORT_CODES, { message: 'Origin must be a supported Russian airport code' })
  origin!: string;

  @ApiProperty({
    example: 'AER',
    description: 'Destination airport IATA code',
  })
  @IsString()
  @IsIn(SUPPORTED_AIRPORT_CODES, { message: 'Destination must be a supported Russian airport code' })
  destination!: string;

  @ApiProperty({
    example: '2026-07-15',
    description: 'Departure date (YYYY-MM-DD)',
  })
  @IsDateString()
  departure_date!: string;

  @ApiPropertyOptional({
    example: '2026-07-22',
    description: 'Return date for round-trip (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  return_date?: string;

  @ApiPropertyOptional({ example: 1, description: 'Number of passengers (1-9)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  passengers?: number = 1;

  @ApiPropertyOptional({
    example: 'economy',
    description: 'Cabin class',
    enum: ['economy', 'business'],
    default: 'economy',
  })
  @IsOptional()
  @IsIn(['economy', 'business'])
  cabin_class?: string = 'economy';
}

export class SearchCalendarDto {
  @ApiProperty({ example: 'SVO', description: 'Origin airport IATA code' })
  @IsString()
  @IsIn(SUPPORTED_AIRPORT_CODES, { message: 'Origin must be a supported Russian airport code' })
  origin!: string;

  @ApiProperty({
    example: 'AER',
    description: 'Destination airport IATA code',
  })
  @IsString()
  @IsIn(SUPPORTED_AIRPORT_CODES, { message: 'Destination must be a supported Russian airport code' })
  destination!: string;

  @ApiProperty({
    example: '2026-07',
    description: 'Month to search (YYYY-MM)',
  })
  @IsString()
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/, { message: 'Month must be in YYYY-MM format' })
  month!: string;
}

/** Response DTO for search results (used in Swagger docs) */
export class FlightResultDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'SU' })
  airline!: string;

  @ApiProperty({ example: 'Аэрофлот' })
  airline_name!: string;

  @ApiProperty({ example: 'SU-1234' })
  flight_number!: string;

  @ApiProperty({ example: 'SVO' })
  origin!: string;

  @ApiProperty({ example: 'AER' })
  destination!: string;

  @ApiProperty({ example: '2026-07-15T08:30:00.000Z' })
  departure_at!: string;

  @ApiProperty({ example: '2026-07-15T11:00:00.000Z' })
  arrival_at!: string;

  @ApiProperty({ example: 150 })
  duration_min!: number;

  @ApiProperty({ example: 8500 })
  price!: number;

  @ApiProperty({ example: 'RUB' })
  currency!: string;

  @ApiProperty({ example: 0 })
  stops!: number;

  @ApiProperty({ example: 12 })
  available_seats!: number;

  @ApiProperty({ example: 'economy' })
  cabin_class!: string;
}

export class SearchMetadataDto {
  @ApiProperty({ example: 10 })
  total!: number;

  @ApiProperty({ example: false })
  cached!: boolean;

  @ApiProperty({ example: 45 })
  search_time_ms!: number;
}

export class SearchResultDto {
  @ApiProperty({ type: [FlightResultDto] })
  flights!: FlightResultDto[];

  @ApiProperty({ type: SearchMetadataDto })
  metadata!: SearchMetadataDto;
}

export class CalendarDayDto {
  @ApiProperty({ example: '2026-07-15' })
  date!: string;

  @ApiProperty({ example: 7200 })
  min_price!: number;

  @ApiProperty({ example: 'green', enum: ['green', 'yellow', 'red'] })
  tier!: string;
}

export class CalendarResultDto {
  @ApiProperty({ type: [CalendarDayDto] })
  dates!: CalendarDayDto[];
}
