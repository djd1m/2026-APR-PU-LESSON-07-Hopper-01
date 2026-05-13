import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Amadeus Self-Service API client.
 * Docs: https://developers.amadeus.com/self-service/category/flights
 *
 * Sandbox (free): https://test.api.amadeus.com
 * Production:     https://api.amadeus.com
 *
 * Register: https://developers.amadeus.com → Create App → get client_id + client_secret
 */

const SANDBOX_URL = 'https://test.api.amadeus.com';
const PROD_URL = 'https://api.amadeus.com';

interface AmadeusToken {
  access_token: string;
  expires_at: number; // epoch ms
}

export interface AmadeusFlightResult {
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
  source: 'amadeus';
}

@Injectable()
export class AmadeusService {
  private readonly logger = new Logger(AmadeusService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private token: AmadeusToken | null = null;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('AMADEUS_CLIENT_ID', '');
    this.clientSecret = this.config.get<string>('AMADEUS_CLIENT_SECRET', '');
    const env = this.config.get<string>('AMADEUS_ENV', 'test');
    this.baseUrl = env === 'production' ? PROD_URL : SANDBOX_URL;

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('AMADEUS_CLIENT_ID/SECRET not set — Amadeus search disabled');
    } else {
      this.logger.log(`Amadeus initialized: ${this.baseUrl} (${env})`);
    }
  }

  isAvailable(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  /**
   * Search real flights via Amadeus Flight Offers Search API.
   * Returns actual airline schedules with real prices.
   */
  async searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    passengers: number,
    cabinClass: string = 'ECONOMY',
  ): Promise<AmadeusFlightResult[]> {
    if (!this.isAvailable()) return [];

    try {
      const token = await this.getToken();

      const params = new URLSearchParams({
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate,
        adults: String(passengers),
        travelClass: cabinClass.toUpperCase(),
        nonStop: 'false',
        max: '20',
        currencyCode: 'RUB',
      });

      const url = `${this.baseUrl}/v2/shopping/flight-offers?${params}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        this.logger.error(`Amadeus search ${resp.status}: ${text.substring(0, 200)}`);
        return [];
      }

      const data = await resp.json();
      const dictionaries = data.dictionaries || {};
      const carriers = dictionaries.carriers || {};

      const results: AmadeusFlightResult[] = [];

      for (const offer of data.data || []) {
        const itinerary = offer.itineraries?.[0];
        if (!itinerary) continue;

        const segments = itinerary.segments || [];
        const firstSeg = segments[0];
        const lastSeg = segments[segments.length - 1];
        if (!firstSeg) continue;

        const carrierCode = firstSeg.carrierCode || 'XX';
        const flightNum = firstSeg.number || '0000';
        const price = parseFloat(offer.price?.grandTotal || offer.price?.total || '0');

        // Parse duration: "PT2H30M" → minutes
        const durationStr = itinerary.duration || '';
        const durationMin = this.parseDuration(durationStr);

        results.push({
          id: `amadeus-${offer.id}`,
          airline: carrierCode,
          airline_name: carriers[carrierCode] || carrierCode,
          flight_number: `${carrierCode}-${flightNum}`,
          origin: firstSeg.departure?.iataCode || origin,
          destination: lastSeg.arrival?.iataCode || destination,
          departure_at: firstSeg.departure?.at || '',
          arrival_at: lastSeg.arrival?.at || '',
          duration_min: durationMin,
          price: Math.round(price),
          currency: offer.price?.currency || 'RUB',
          stops: segments.length - 1,
          available_seats: offer.numberOfBookableSeats || 9,
          cabin_class: cabinClass,
          source: 'amadeus',
        });
      }

      results.sort((a, b) => a.price - b.price);
      this.logger.log(`Amadeus: found ${results.length} real flights for ${origin}->${destination} on ${departureDate}`);
      return results;
    } catch (err) {
      this.logger.error(`Amadeus search error: ${err.message}`);
      return [];
    }
  }

  // ─── Private ────────────────────────────────────────────

  private async getToken(): Promise<string> {
    // Reuse token if still valid (with 60s buffer)
    if (this.token && this.token.expires_at > Date.now() + 60000) {
      return this.token.access_token;
    }

    const resp = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      throw new Error(`Amadeus auth failed: ${resp.status}`);
    }

    const data = await resp.json();
    this.token = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in || 1799) * 1000,
    };

    this.logger.log('Amadeus OAuth2 token obtained');
    return this.token.access_token;
  }

  /** Parse ISO 8601 duration "PT2H30M" → 150 minutes */
  private parseDuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
  }
}
