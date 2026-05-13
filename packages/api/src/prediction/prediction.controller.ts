import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { PredictionService } from './prediction.service';

@ApiTags('prediction')
@Controller('predict')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get price prediction for a route and date',
  })
  @ApiQuery({
    name: 'route',
    example: 'SVO-AER',
    description: 'Route as ORIGIN-DESTINATION',
  })
  @ApiQuery({
    name: 'date',
    example: '2026-07-15',
    description: 'Departure date (YYYY-MM-DD)',
  })
  @ApiOkResponse({
    description: 'Price prediction with recommendation, confidence, and factors',
  })
  async predict(
    @Query('route') route: string,
    @Query('date') date: string,
  ) {
    const prediction = await this.predictionService.predict(route, date);
    return {
      prediction,
      generated_at: new Date().toISOString(),
      next_update_at: new Date(
        Date.now() + 6 * 60 * 60 * 1000,
      ).toISOString(),
    };
  }
}
