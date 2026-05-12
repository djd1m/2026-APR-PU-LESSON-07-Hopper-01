import {
  IsString,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchFlightsDto {
  @ApiProperty({ example: 'SVO', description: 'Origin airport IATA code' })
  @IsString()
  @Length(3, 3)
  origin!: string;

  @ApiProperty({
    example: 'AER',
    description: 'Destination airport IATA code',
  })
  @IsString()
  @Length(3, 3)
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

  @ApiPropertyOptional({ example: 1, description: 'Number of passengers', default: 1 })
  @IsOptional()
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
  @Length(3, 3)
  origin!: string;

  @ApiProperty({
    example: 'AER',
    description: 'Destination airport IATA code',
  })
  @IsString()
  @Length(3, 3)
  destination!: string;

  @ApiProperty({
    example: '2026-07',
    description: 'Month to search (YYYY-MM)',
  })
  @IsString()
  month!: string;
}
