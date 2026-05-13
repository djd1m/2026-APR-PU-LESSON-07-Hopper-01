import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import {
  SearchFlightsDto,
  SearchCalendarDto,
  SearchResultDto,
  CalendarResultDto,
} from './search.dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('flights')
  @ApiOperation({
    summary: 'Search flights by route, date, and passengers',
    description:
      'Returns a list of available flights for the given origin, destination, and date. ' +
      'Results are cached in Redis for 5 minutes. Prices are in RUB.',
  })
  @ApiQuery({ name: 'origin', example: 'SVO', description: 'Origin airport IATA code' })
  @ApiQuery({ name: 'destination', example: 'AER', description: 'Destination airport IATA code' })
  @ApiQuery({ name: 'departure_date', example: '2026-07-15', description: 'Departure date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'passengers', required: false, example: 1, description: 'Number of passengers (1-9)' })
  @ApiQuery({ name: 'cabin_class', required: false, example: 'economy', description: 'Cabin class: economy or business' })
  @ApiOkResponse({ description: 'List of matching flights sorted by price', type: SearchResultDto })
  async searchFlights(@Query() dto: SearchFlightsDto): Promise<SearchResultDto> {
    return this.searchService.searchFlights(dto);
  }

  @Get('calendar')
  @ApiOperation({
    summary: 'Get price calendar for a route and month',
    description:
      'Returns the minimum price per day for the given route and month. ' +
      'Days are color-coded: green (cheapest 20%), yellow (middle 60%), red (most expensive 20%).',
  })
  @ApiQuery({ name: 'origin', example: 'SVO', description: 'Origin airport IATA code' })
  @ApiQuery({ name: 'destination', example: 'AER', description: 'Destination airport IATA code' })
  @ApiQuery({ name: 'month', example: '2026-07', description: 'Month to search (YYYY-MM)' })
  @ApiOkResponse({ description: 'Daily minimum prices with color-coded tiers', type: CalendarResultDto })
  async getCalendar(@Query() dto: SearchCalendarDto): Promise<CalendarResultDto> {
    return this.searchService.getCalendar(dto);
  }

  @Get('flights/:id')
  @ApiOperation({ summary: 'Get flight details by ID' })
  async getFlightById(@Param('id') id: string) {
    const flight = await this.searchService.getFlightById(id);
    if (!flight) throw new NotFoundException('Рейс не найден');
    return flight;
  }
}
