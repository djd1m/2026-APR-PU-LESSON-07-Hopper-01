import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { TrainSearchService } from './train-search.service';

@ApiTags('search')
@Controller('api/search')
export class TrainSearchController {
  constructor(private readonly trainSearchService: TrainSearchService) {}

  @Get('trains')
  @ApiOperation({
    summary: 'Search trains by route and date',
    description:
      'Returns available Russian railway trains (RZD) for the given route and date. ' +
      'Supports Sapsan, Lastochka, firmenny, and passenger trains. ' +
      'Prices include platskart, kupe, SV, and business classes.',
  })
  @ApiQuery({ name: 'origin', example: 'Москва', description: 'Origin city name' })
  @ApiQuery({ name: 'destination', example: 'Санкт-Петербург', description: 'Destination city name' })
  @ApiQuery({ name: 'date', example: '2026-07-15', description: 'Travel date (YYYY-MM-DD)' })
  @ApiOkResponse({ description: 'List of available trains sorted by departure time' })
  async searchTrains(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('date') date: string,
  ) {
    return this.trainSearchService.searchTrains(origin, destination, date);
  }
}
