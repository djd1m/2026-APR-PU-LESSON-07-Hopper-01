import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis.service';
import { SearchFlightsDto, SearchCalendarDto } from './search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Search flights by route, date, passengers, and cabin class.
   * Aggregates results from airline GDS/APIs and caches in Redis.
   */
  async searchFlights(dto: SearchFlightsDto) {
    const cacheKey = `search:${dto.origin}:${dto.destination}:${dto.departure_date}:${dto.passengers}:${dto.cabin_class}`;

    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    // TODO: Call airline GDS/APIs (Amadeus, Sabre, direct airline APIs)
    // TODO: Aggregate and deduplicate results from multiple sources
    // TODO: Enrich each result with price prediction (call PredictionService)

    const results = {
      results: [
        {
          id: 'placeholder-uuid',
          airline: 'SU',
          flight_number: 'SU-1234',
          origin: dto.origin,
          destination: dto.destination,
          departure_at: `${dto.departure_date}T08:30:00+03:00`,
          arrival_at: `${dto.departure_date}T11:00:00+03:00`,
          duration_min: 150,
          stops: 0,
          price: { amount: 8500, currency: 'RUB' },
          available_seats: 12,
          prediction: null, // TODO: attach prediction
        },
      ],
      total_results: 1,
      search_id: 'placeholder-search-id',
    };

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(results));

    return results;
  }

  /**
   * Get cheapest prices per day for a given route and month.
   * Used for the calendar view in the UI.
   */
  async getCalendar(dto: SearchCalendarDto) {
    const cacheKey = `calendar:${dto.origin}:${dto.destination}:${dto.month}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // TODO: Query price history or call supplier APIs for calendar data
    // TODO: Classify each date into tiers: green (cheap), yellow (avg), red (expensive)

    const calendar = {
      dates: [
        { date: `${dto.month}-14`, min_price: 7200, tier: 'green' },
        { date: `${dto.month}-15`, min_price: 8500, tier: 'yellow' },
        { date: `${dto.month}-16`, min_price: 11000, tier: 'red' },
      ],
    };

    // Cache calendar for 30 minutes
    await this.redis.setex(cacheKey, 1800, JSON.stringify(calendar));

    return calendar;
  }
}
