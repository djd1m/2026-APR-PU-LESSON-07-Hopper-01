import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchFlightsDto, SearchCalendarDto } from './search.dto';

@ApiTags('search')
@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('flights')
  @ApiOperation({ summary: 'Search flights by route, date, and passengers' })
  @ApiOkResponse({ description: 'List of matching flights with predictions' })
  async searchFlights(@Query() dto: SearchFlightsDto) {
    return this.searchService.searchFlights(dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get price calendar for a route and month' })
  @ApiOkResponse({ description: 'Daily min prices with color-coded tiers' })
  async getCalendar(@Query() dto: SearchCalendarDto) {
    return this.searchService.getCalendar(dto);
  }
}
