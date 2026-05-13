import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { PredictionService } from './prediction.service';
import { PredictRequestDto, PredictionResponseDto } from './prediction.dto';

@ApiTags('prediction')
@Controller('api/predict')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Get price prediction for a route and date',
    description:
      'Returns BUY_NOW / WAIT / INSUFFICIENT_DATA recommendation with confidence scoring, ' +
      'factors breakdown, and Russian-language explanation.',
  })
  @ApiQuery({
    name: 'origin',
    example: 'SVO',
    description: 'Origin airport IATA code',
  })
  @ApiQuery({
    name: 'destination',
    example: 'AER',
    description: 'Destination airport IATA code',
  })
  @ApiQuery({
    name: 'date',
    example: '2026-07-15',
    description: 'Departure date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'current_price',
    example: 8500,
    description: 'Current observed price in RUB',
  })
  @ApiOkResponse({
    description: 'Price prediction with recommendation, confidence, and factors',
    type: PredictionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async predict(@Query() query: PredictRequestDto) {
    const prediction = await this.predictionService.predict(
      query.origin.toUpperCase(),
      query.destination.toUpperCase(),
      query.date,
      query.current_price,
    );

    return {
      prediction,
      generated_at: new Date().toISOString(),
      next_update_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    };
  }
}
