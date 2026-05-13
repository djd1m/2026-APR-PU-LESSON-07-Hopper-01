import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Travelpayouts Data API client.
 * Docs: https://travelpayouts-data-api.readthedocs.io/
 *
 * Endpoints used:
 * - /v1/prices/cheap — cheapest tickets for route
 * - /v1/prices/calendar — daily prices for route+month
 * - /v2/prices/latest — latest found prices
 * - /v2/prices/month-matrix — month price matrix
 */

const BASE_URL = 'https://api.travelpayouts.com';

interface TravelpayoutsFlight {
  price: number;
  airline: string;
  flight_number: number;
  departure_at: string;
  return_at: string;
  expires_at: string;
  number_of_changes?: number;
  transfers?: number;
}

interface CalendarEntry {
  origin: string;
  destination: string;
  price: number;
  transfers: number;
  airline: string;
  flight_number: number;
  departure_at: string;
  return_at: string;
  expires_at: string;
}

export interface TPFlightResult {
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
  source: 'travelpayouts';
}

export interface TPCalendarDay {
  date: string;
  price: number;
  airline: string;
  transfers: number;
  tier: 'green' | 'yellow' | 'red';
}

const AIRLINE_NAMES: Record<string, string> = {
  SU: 'Аэрофлот', S7: 'S7 Airlines', DP: 'Победа', U6: 'Уральские авиалинии',
  FV: 'Россия', N4: 'Северный Ветер', UT: 'ЮТэйр', '5N': 'Nordwind',
  A4: 'Azimuth', IO: 'IrAero', WZ: 'Red Wings', GH: 'Globus',
  QR: 'Qatar', TK: 'Turkish', EK: 'Emirates', PC: 'Pegasus',
};

/** Rough flight duration estimates based on distance */
const ROUTE_DURATIONS: Record<string, number> = {
  'MOW-LED': 85, 'MOW-AER': 150, 'MOW-SVX': 155, 'MOW-OVB': 240,
  'MOW-KRR': 140, 'MOW-KZN': 100, 'MOW-ROV': 120, 'MOW-UFA': 130,
  'MOW-KGD': 130, 'MOW-MRV': 150, 'MOW-IKT': 330, 'MOW-VVO': 510,
  'LED-AER': 180, 'LED-KGD': 110, 'LED-SVX': 170,
};

@Injectable()
export class TravelpayoutsService {
  private readonly logger = new Logger(TravelpayoutsService.name);
  private readonly token: string | null;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('TRAVELPAYOUTS_TOKEN') || null;
    if (!this.token) {
      this.logger.warn('TRAVELPAYOUTS_TOKEN not set — real flight search disabled');
    }
  }

  isAvailable(): boolean {
    return !!this.token;
  }

  /**
   * Search for cheapest flights using /v1/prices/cheap + /v2/prices/latest
   */
  async searchFlights(
    origin: string,
    destination: string,
    departDate: string,
    passengers: number,
  ): Promise<TPFlightResult[]> {
    if (!this.token) return [];

    // Use Moscow city code for SVO/DME/VKO
    const originCity = this.toCity(origin);
    const destCity = this.toCity(destination);

    try {
      // Fetch from two endpoints in parallel for richer data
      const [cheapResp, latestResp] = await Promise.allSettled([
        this.fetchAPI(`/v1/prices/cheap`, {
          origin: originCity,
          destination: destCity,
          depart_date: departDate,
          currency: 'rub',
          one_way: 'true',
        }),
        this.fetchAPI(`/v2/prices/latest`, {
          origin: originCity,
          destination: destCity,
          beginning_of_period: departDate,
          period_type: 'month',
          currency: 'rub',
          limit: '30',
          sorting: 'price',
          one_way: 'true',
        }),
      ]);

      const flights: TPFlightResult[] = [];
      const seenIds = new Set<string>();

      // Parse /v1/prices/cheap
      if (cheapResp.status === 'fulfilled' && cheapResp.value?.success) {
        const data = cheapResp.value.data;
        for (const destCode of Object.keys(data || {})) {
          for (const stops of Object.keys(data[destCode] || {})) {
            const f = data[destCode][stops] as TravelpayoutsFlight;
            if (!f?.departure_at) continue;
            const fDate = f.departure_at.split('T')[0];
            if (fDate !== departDate) continue;

            const result = this.toFlightResult(f, origin, destination, Number(stops));
            if (!seenIds.has(result.id)) {
              seenIds.add(result.id);
              flights.push(result);
            }
          }
        }
      }

      // Parse /v2/prices/latest
      if (latestResp.status === 'fulfilled' && latestResp.value?.success) {
        for (const entry of latestResp.value.data || []) {
          if (!entry.depart_date || entry.depart_date !== departDate) continue;
          const result: TPFlightResult = {
            id: `tp-${entry.origin}-${entry.destination}-${entry.depart_date}-${entry.value}-${entry.number_of_changes}`,
            airline: entry.gate || 'XX',
            airline_name: AIRLINE_NAMES[entry.gate] || entry.gate || 'Unknown',
            flight_number: `${entry.gate || 'XX'}-${Math.floor(Math.random() * 9000) + 1000}`,
            origin,
            destination,
            departure_at: `${entry.depart_date}T08:00:00Z`,
            arrival_at: `${entry.depart_date}T10:00:00Z`,
            duration_min: this.estimateDuration(origin, destination),
            price: Math.round(entry.value * passengers),
            currency: 'RUB',
            stops: entry.number_of_changes || 0,
            available_seats: 15,
            source: 'travelpayouts',
          };
          if (!seenIds.has(result.id)) {
            seenIds.add(result.id);
            flights.push(result);
          }
        }
      }

      flights.sort((a, b) => a.price - b.price);
      this.logger.log(`Travelpayouts: found ${flights.length} flights for ${origin}->${destination} on ${departDate}`);
      return flights;
    } catch (err) {
      this.logger.error(`Travelpayouts search error: ${err.message}`);
      return [];
    }
  }

  /**
   * Get price calendar using /v1/prices/calendar
   */
  async getCalendar(
    origin: string,
    destination: string,
    month: string, // YYYY-MM
  ): Promise<TPCalendarDay[]> {
    if (!this.token) return [];

    const originCity = this.toCity(origin);
    const destCity = this.toCity(destination);

    try {
      const resp = await this.fetchAPI(`/v1/prices/calendar`, {
        origin: originCity,
        destination: destCity,
        depart_date: month,
        calendar_type: 'departure_date',
        currency: 'rub',
      });

      if (!resp?.success || !resp.data) return [];

      const entries: TPCalendarDay[] = [];
      const prices: number[] = [];

      for (const [date, entry] of Object.entries(resp.data as Record<string, CalendarEntry>)) {
        if (!entry?.price) continue;
        prices.push(entry.price);
        entries.push({
          date,
          price: entry.price,
          airline: entry.airline || 'XX',
          transfers: entry.transfers || 0,
          tier: 'yellow', // will recalculate below
        });
      }

      // Color-code by percentile
      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        const p20 = prices[Math.floor(prices.length * 0.2)];
        const p80 = prices[Math.floor(prices.length * 0.8)];
        for (const entry of entries) {
          if (entry.price <= p20) entry.tier = 'green';
          else if (entry.price >= p80) entry.tier = 'red';
          else entry.tier = 'yellow';
        }
      }

      entries.sort((a, b) => a.date.localeCompare(b.date));
      this.logger.log(`Travelpayouts calendar: ${entries.length} days for ${origin}->${destination} ${month}`);
      return entries;
    } catch (err) {
      this.logger.error(`Travelpayouts calendar error: ${err.message}`);
      return [];
    }
  }

  // ─── Private helpers ────────────────────────────────────

  private async fetchAPI(path: string, params: Record<string, string>): Promise<any> {
    const url = new URL(path, BASE_URL);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    url.searchParams.set('token', this.token!);

    const resp = await fetch(url.toString(), {
      headers: { 'X-Access-Token': this.token! },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      throw new Error(`Travelpayouts ${resp.status}: ${await resp.text()}`);
    }

    return resp.json();
  }

  private toFlightResult(
    f: TravelpayoutsFlight,
    origin: string,
    destination: string,
    stops: number,
  ): TPFlightResult {
    const airlineCode = f.airline || 'XX';
    const depTime = f.departure_at || '';
    const duration = this.estimateDuration(origin, destination);

    return {
      id: `tp-${airlineCode}-${f.flight_number}-${depTime}`,
      airline: airlineCode,
      airline_name: AIRLINE_NAMES[airlineCode] || airlineCode,
      flight_number: `${airlineCode}-${f.flight_number}`,
      origin,
      destination,
      departure_at: depTime,
      arrival_at: this.addMinutes(depTime, duration),
      duration_min: duration,
      price: f.price,
      currency: 'RUB',
      stops,
      available_seats: 20,
      source: 'travelpayouts',
    };
  }

  private toCity(iata: string): string {
    const moscowAirports: Record<string, string> = { SVO: 'MOW', DME: 'MOW', VKO: 'MOW', ZIA: 'MOW' };
    const spbAirports: Record<string, string> = { LED: 'LED' };
    return moscowAirports[iata] || spbAirports[iata] || iata;
  }

  private estimateDuration(origin: string, destination: string): number {
    const key1 = `${this.toCity(origin)}-${this.toCity(destination)}`;
    const key2 = `${this.toCity(destination)}-${this.toCity(origin)}`;
    return ROUTE_DURATIONS[key1] || ROUTE_DURATIONS[key2] || 150;
  }

  private addMinutes(isoDate: string, minutes: number): string {
    try {
      const d = new Date(isoDate);
      d.setMinutes(d.getMinutes() + minutes);
      return d.toISOString();
    } catch {
      return isoDate;
    }
  }
}
