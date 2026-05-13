import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis.service';
import { SearchFlightsDto, SearchCalendarDto } from './search.dto';
import { TravelpayoutsService } from './travelpayouts.service';
import { AmadeusService } from './amadeus.service';

/** Approximate flight distances (km) between major Russian airports */
const ROUTE_DISTANCES: Record<string, number> = {
  'SVO-AER': 1360, 'SVO-LED': 635, 'SVO-SVX': 1415, 'SVO-OVB': 2811,
  'SVO-KRR': 1195, 'SVO-ROV': 960, 'SVO-KZN': 725, 'SVO-UFA': 1170,
  'SVO-VOG': 910, 'SVO-KGD': 1085, 'SVO-MRV': 1360, 'SVO-AAQ': 1235,
  'SVO-IKT': 4200, 'SVO-KHV': 6140, 'SVO-VVO': 6430, 'SVO-TJM': 1720,
  'SVO-CEK': 1500, 'DME-AER': 1360, 'DME-LED': 635, 'DME-SVX': 1415,
  'DME-OVB': 2811, 'DME-KRR': 1195, 'VKO-AER': 1360, 'VKO-LED': 635,
  'LED-AER': 1960, 'LED-SVX': 1790, 'LED-KGD': 860, 'LED-KRR': 1690,
  'SVX-OVB': 1400, 'SVX-KRR': 1900, 'OVB-IKT': 1400, 'OVB-KHV': 3300,
  'KHV-VVO': 760,
};

/** Base prices (RUB) per km for each airline */
const AIRLINE_PRICE_PER_KM: Record<string, number> = {
  SU: 4.5,  // Аэрофлот — premium
  S7: 3.8,  // S7 — mid-range
  DP: 2.2,  // Победа — low-cost
  U6: 3.2,  // Уральские — mid-range
  FV: 3.5,  // Россия — mid-range
};

const AIRLINE_CODES = ['SU', 'S7', 'DP', 'U6', 'FV'] as const;

const AIRLINE_NAMES: Record<string, string> = {
  SU: 'Аэрофлот',
  S7: 'S7 Airlines',
  DP: 'Победа',
  U6: 'Уральские авиалинии',
  FV: 'Россия',
};

interface FlightResult {
  id: string;
  airline: string;
  airline_name: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration_min: number;
  price: number;
  currency: string;
  stops: number;
  available_seats: number;
  cabin_class: string;
}

interface SearchResultResponse {
  flights: FlightResult[];
  metadata: {
    total: number;
    cached: boolean;
    search_time_ms: number;
  };
}

interface CalendarDay {
  date: string;
  min_price: number;
  tier: 'green' | 'yellow' | 'red';
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly travelpayouts: TravelpayoutsService,
    private readonly amadeus: AmadeusService,
  ) {}

  /**
   * Search flights by route, date, passengers, and cabin class.
   * Checks Redis cache first, generates mock data on miss.
   */
  async searchFlights(dto: SearchFlightsDto): Promise<SearchResultResponse> {
    const startTime = Date.now();
    const cacheKey = `search:${dto.origin}:${dto.destination}:${dto.departure_date}`;

    // Check cache first
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      const parsed = JSON.parse(cached) as SearchResultResponse;
      parsed.metadata.cached = true;
      parsed.metadata.search_time_ms = Date.now() - startTime;
      return parsed;
    }

    // Priority: Amadeus (full schedules) → Travelpayouts (prices) → Mock
    let flights: any[];
    let source = 'mock';

    // 1. Try Amadeus — returns real flight schedules with actual prices
    if (this.amadeus.isAvailable()) {
      const amadeusFlights = await this.amadeus.searchFlights(
        dto.origin,
        dto.destination,
        dto.departure_date,
        dto.passengers || 1,
        dto.cabin_class || 'ECONOMY',
      );
      if (amadeusFlights.length > 0) {
        flights = amadeusFlights;
        source = 'amadeus';
        this.logger.log(`Using Amadeus: ${flights.length} real flights`);

        const result: SearchResultResponse = {
          flights,
          metadata: { total: flights.length, cached: false, search_time_ms: Date.now() - startTime },
        };
        await this.redis.setex(cacheKey, 300, JSON.stringify(result)).catch(() => {});
        return result;
      }
      this.logger.warn('Amadeus returned 0 results, trying Travelpayouts...');
    }

    // 2. Try Travelpayouts — returns best price, supplemented with estimates
    if (this.travelpayouts.isAvailable()) {
      const tpFlights = await this.travelpayouts.searchFlights(
        dto.origin,
        dto.destination,
        dto.departure_date,
        dto.passengers || 1,
      );

      // Travelpayouts Data API returns only cheapest price per route.
      // Supplement with mock flights anchored to the real price for realistic variety.
      const mockFlights = this.generateMockFlights(
        dto.origin, dto.destination, dto.departure_date,
        dto.cabin_class || 'economy', dto.passengers || 1,
      );

      if (tpFlights.length > 0) {
        // Use real price as anchor — adjust mock prices around it
        const realPrice = tpFlights[0].price;
        const adjustedMocks = mockFlights.map((f: any) => ({
          ...f,
          price: Math.round(realPrice * (0.85 + Math.random() * 0.5)), // ±30% around real price
          source: 'estimated',
        }));
        flights = [...tpFlights, ...adjustedMocks];
        source = 'travelpayouts+estimated';
        this.logger.log(`Travelpayouts: 1 real + ${adjustedMocks.length} estimated flights`);
      } else {
        flights = mockFlights;
        source = 'mock';
        this.logger.warn(`Travelpayouts returned 0 results, using mock data`);
      }
    } else {
      flights = this.generateMockFlights(
        dto.origin, dto.destination, dto.departure_date,
        dto.cabin_class || 'economy', dto.passengers || 1,
      );
    }

    flights.sort((a, b) => a.price - b.price);

    const result: SearchResultResponse = {
      flights,
      metadata: {
        total: flights.length,
        cached: false,
        search_time_ms: Date.now() - startTime,
      },
    };

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(result)).catch((err) => {
      this.logger.warn(`Failed to cache search result: ${err.message}`);
    });

    return result;
  }

  /**
   * Get a single flight by ID from Redis search cache.
   * Scans all cached search results to find the flight.
   */
  async getFlightById(id: string): Promise<any | null> {
    try {
      const keys = await this.redis.keys('search:*');
      for (const key of keys) {
        const cached = await this.redis.get(key);
        if (!cached) continue;
        const data = JSON.parse(cached);
        const flight = data.flights?.find((f: any) => f.id === id);
        if (flight) return flight;
      }
    } catch (err) {
      this.logger.warn(`getFlightById error: ${err.message}`);
    }
    return null;
  }

  /**
   * Get cheapest prices per day for a given route and month.
   * Color-codes: cheapest 20% green, middle 60% yellow, top 20% red.
   */
  async getCalendar(dto: SearchCalendarDto): Promise<{ dates: CalendarDay[] }> {
    const cacheKey = `calendar:${dto.origin}:${dto.destination}:${dto.month}`;

    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      return JSON.parse(cached);
    }

    // Parse month to get year and month number
    const [yearStr, monthStr] = dto.month.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Generate min prices for each day
    const rawDays: { date: string; min_price: number }[] = [];
    const distance = this.getRouteDistance(dto.origin, dto.destination);
    const basePrice = distance * 3.2; // average airline price/km

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${dto.month}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();

      // Price factors
      let priceFactor = 1.0;

      // Weekend premium
      if (dayOfWeek === 5 || dayOfWeek === 0) priceFactor *= 1.15;
      if (dayOfWeek === 6) priceFactor *= 1.05;

      // Mid-week discount
      if (dayOfWeek === 2 || dayOfWeek === 3) priceFactor *= 0.88;

      // Summer premium (June-August)
      if (month >= 6 && month <= 8) priceFactor *= 1.35;

      // New Year period
      if (month === 12 && day >= 25) priceFactor *= 1.6;
      if (month === 1 && day <= 10) priceFactor *= 1.5;

      // Random variation +/- 15%
      const seed = this.seededRandom(`${dto.origin}${dto.destination}${dateStr}`);
      priceFactor *= 0.85 + seed * 0.3;

      const minPrice = Math.round(basePrice * priceFactor / 100) * 100;
      rawDays.push({ date: dateStr, min_price: Math.max(minPrice, 1500) });
    }

    // Sort prices to determine tiers
    const sortedPrices = rawDays.map((d) => d.min_price).sort((a, b) => a - b);
    const greenThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.2)];
    const redThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.8)];

    const dates: CalendarDay[] = rawDays.map((d) => ({
      date: d.date,
      min_price: d.min_price,
      tier: d.min_price <= greenThreshold
        ? 'green'
        : d.min_price >= redThreshold
          ? 'red'
          : 'yellow',
    }));

    const calendar = { dates };

    // Cache calendar for 30 minutes
    await this.redis.setex(cacheKey, 1800, JSON.stringify(calendar)).catch((err) => {
      this.logger.warn(`Failed to cache calendar: ${err.message}`);
    });

    return calendar;
  }

  /**
   * Generate 5-15 realistic mock flights for a route and date.
   */
  private generateMockFlights(
    origin: string,
    destination: string,
    date: string,
    cabinClass: string,
    passengers: number,
  ): FlightResult[] {
    const distance = this.getRouteDistance(origin, destination);
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const month = dateObj.getMonth() + 1;

    // Determine how many days in advance
    const today = new Date();
    const advanceDays = Math.max(0, Math.floor((dateObj.getTime() - today.getTime()) / 86400000));

    // Number of flights: 5-15 depending on route popularity
    const seed = this.seededRandom(`count:${origin}:${destination}:${date}`);
    const numFlights = 5 + Math.floor(seed * 11); // 5-15

    const flights: FlightResult[] = [];

    for (let i = 0; i < numFlights; i++) {
      const airlineIdx = i % AIRLINE_CODES.length;
      const airline = AIRLINE_CODES[airlineIdx];
      const flightSeed = this.seededRandom(`flight:${origin}:${destination}:${date}:${i}`);

      // Flight number: airline code + 3-4 digit number
      const flightNum = 100 + Math.floor(flightSeed * 8900);
      const flightNumber = `${airline}-${flightNum}`;

      // Departure time: 06:00 to 22:00
      const departureHour = 6 + Math.floor(this.seededRandom(`dep:${flightNumber}:${date}`) * 16);
      const departureMinute = Math.floor(this.seededRandom(`depmin:${flightNumber}:${date}`) * 12) * 5; // 5-minute increments

      // Duration based on distance (avg speed ~800 km/h + 30min taxi/overhead)
      const baseDuration = Math.round(distance / 800 * 60) + 30;
      const durationVariation = Math.floor(this.seededRandom(`dur:${flightNumber}`) * 30) - 10;
      const durationMin = Math.max(60, baseDuration + durationVariation);

      // Compute departure and arrival times
      const depDate = new Date(`${date}T00:00:00+03:00`);
      depDate.setHours(departureHour, departureMinute, 0, 0);
      const arrDate = new Date(depDate.getTime() + durationMin * 60000);

      // Price calculation
      const basePricePerKm = AIRLINE_PRICE_PER_KM[airline] || 3.5;
      let price = distance * basePricePerKm;

      // Advance purchase discount
      if (advanceDays > 60) price *= 0.7;
      else if (advanceDays > 30) price *= 0.8;
      else if (advanceDays > 14) price *= 0.9;
      else if (advanceDays < 3) price *= 1.5;
      else if (advanceDays < 7) price *= 1.25;

      // Weekend premium
      if (dayOfWeek === 5 || dayOfWeek === 0) price *= 1.12;

      // Seasonal adjustments
      if (month >= 6 && month <= 8) price *= 1.3;  // Summer
      if (month === 12) price *= 1.2;               // December holidays
      if (month === 1 && dateObj.getDate() <= 10) price *= 1.4; // New Year

      // Business class multiplier
      if (cabinClass === 'business') price *= 3.2;

      // Random variation +/- 30%
      price *= 0.7 + flightSeed * 0.6;

      // Per-passenger
      price *= passengers;

      // Round to nearest 100 RUB
      price = Math.round(price / 100) * 100;
      price = Math.max(price, 1500 * passengers);

      // Stops: most flights direct for short routes, some with stops for long ones
      let stops = 0;
      if (distance > 3000 && this.seededRandom(`stops:${flightNumber}`) > 0.6) stops = 1;
      if (distance > 5000 && this.seededRandom(`stops2:${flightNumber}`) > 0.5) stops = 1;

      // Available seats: 1-45
      const availableSeats = 1 + Math.floor(this.seededRandom(`seats:${flightNumber}:${date}`) * 45);

      // Generate stable UUID from seed
      const id = this.generateId(`${flightNumber}:${date}:${i}`);

      flights.push({
        id,
        airline,
        airline_name: AIRLINE_NAMES[airline],
        flight_number: flightNumber,
        origin,
        destination,
        departure_at: depDate.toISOString(),
        arrival_at: arrDate.toISOString(),
        duration_min: durationMin,
        price,
        currency: 'RUB',
        stops,
        available_seats: availableSeats,
        cabin_class: cabinClass,
      });
    }

    return flights;
  }

  /**
   * Get approximate distance between two airports in km.
   * Uses lookup table with bidirectional matching, defaults to estimate.
   */
  private getRouteDistance(origin: string, destination: string): number {
    const key1 = `${origin}-${destination}`;
    const key2 = `${destination}-${origin}`;
    if (ROUTE_DISTANCES[key1]) return ROUTE_DISTANCES[key1];
    if (ROUTE_DISTANCES[key2]) return ROUTE_DISTANCES[key2];
    // Default: estimate based on hash for consistency
    return 800 + Math.floor(this.seededRandom(`dist:${key1}`) * 3000);
  }

  /**
   * Simple seeded pseudo-random for deterministic mock data.
   * Returns a number between 0 and 1.
   */
  private seededRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Normalize to 0-1
    return Math.abs(Math.sin(hash) * 10000) % 1;
  }

  /**
   * Generate a deterministic UUID-like ID from a seed string.
   */
  private generateId(seed: string): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
      const idx = Math.floor(this.seededRandom(`${seed}:${i}`) * 16);
      result += chars[idx];
      if (i === 7 || i === 11 || i === 15 || i === 19) result += '-';
    }
    return result;
  }
}
