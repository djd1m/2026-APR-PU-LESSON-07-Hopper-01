import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingProvider,
  BookingRequest,
  BookingResult,
  CancelResult,
} from './booking-provider.interface';

/**
 * Nemo.travel booking provider — REAL GDS booking.
 *
 * Nemo Connect API (docs.nemo.travel):
 * - REST/JSON API over HTTPS
 * - Authentication: API key + secret in headers
 * - Endpoints: /avia/search, /avia/book, /avia/ticket, /avia/cancel
 *
 * Requirements to activate:
 * 1. Sign contract with Nemo.travel (https://www.nemo.travel/)
 * 2. Get NEMO_API_URL, NEMO_API_KEY, NEMO_AGENCY_ID from helpdesk.nemo.travel
 * 3. Set env vars: NEMO_API_URL, NEMO_API_KEY, NEMO_AGENCY_ID
 * 4. Set BOOKING_PROVIDER=nemo in .env
 *
 * Cost: ~$500/mo + $0.25/ticket (see docs/Phase0_Discovery_Brief.md)
 */
@Injectable()
export class NemoBookingProvider implements BookingProvider {
  readonly name = 'nemo';
  private readonly logger = new Logger(NemoBookingProvider.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly agencyId: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get<string>('NEMO_API_URL', '');
    this.apiKey = this.config.get<string>('NEMO_API_KEY', '');
    this.agencyId = this.config.get<string>('NEMO_AGENCY_ID', '');

    if (!this.apiUrl || !this.apiKey) {
      this.logger.warn(
        'Nemo.travel credentials not set (NEMO_API_URL, NEMO_API_KEY). ' +
        'Provider will not be available. See: https://www.nemo.travel/',
      );
    }
  }

  async createBooking(request: BookingRequest): Promise<BookingResult> {
    this.logger.log(`[NEMO] Creating booking: ${request.airline} ${request.flight_number}`);

    if (!this.apiUrl || !this.apiKey) {
      return {
        success: false,
        pnr: '',
        payment_id: '',
        status: 'failed',
        error: 'Nemo.travel не настроен. Задайте NEMO_API_URL и NEMO_API_KEY.',
      };
    }

    try {
      // Step 1: Search for the specific flight in Nemo
      const searchResult = await this.nemoRequest('/avia/search', {
        passengers: {
          ADT: request.passengers.length,
          CLD: 0,
          INF: 0,
        },
        segments: [{
          departure: {
            IATA: request.origin,
            date: request.departure_at.split('T')[0],
          },
          arrival: { IATA: request.destination },
        }],
        class: 'Economy',
      });

      // Step 2: Find matching flight in results
      const flightOffer = this.findMatchingFlight(
        searchResult,
        request.airline,
        request.flight_number,
      );

      if (!flightOffer) {
        return {
          success: false, pnr: '', payment_id: '', status: 'failed',
          error: 'Рейс не найден в системе бронирования.',
        };
      }

      // Step 3: Book the flight
      const bookResult = await this.nemoRequest('/avia/book', {
        flightId: flightOffer.id,
        passengers: request.passengers.map((p) => ({
          type: 'ADT',
          firstName: p.first_name,
          lastName: p.last_name,
          docType: 'passport',
          docNumber: p.passport_number,
          birthDate: p.date_of_birth,
          nationality: p.nationality,
        })),
        contactPhone: request.contact_phone,
        contactEmail: request.contact_email,
      });

      // Step 4: Issue ticket (ticketing)
      const ticketResult = await this.nemoRequest('/avia/ticket', {
        bookingId: bookResult.bookingId,
      });

      return {
        success: true,
        pnr: bookResult.pnr || ticketResult.pnr,
        payment_id: `nemo-${bookResult.bookingId}`,
        status: 'confirmed',
        ticket_number: ticketResult.ticketNumber,
        raw_response: { search: searchResult, book: bookResult, ticket: ticketResult },
      };
    } catch (err) {
      this.logger.error(`[NEMO] Booking failed: ${err.message}`);
      return {
        success: false, pnr: '', payment_id: '', status: 'failed',
        error: `Ошибка бронирования: ${err.message}`,
      };
    }
  }

  async cancelBooking(pnr: string): Promise<CancelResult> {
    this.logger.log(`[NEMO] Cancelling: PNR=${pnr}`);

    try {
      const result = await this.nemoRequest('/avia/cancel', { pnr });
      return {
        success: true,
        refund_amount: result.refundAmount || 0,
        refund_currency: 'RUB',
        processing_days: result.processingDays || 10,
      };
    } catch (err) {
      return {
        success: false, refund_amount: 0, refund_currency: 'RUB',
        processing_days: 0, error: err.message,
      };
    }
  }

  async getBookingStatus(pnr: string): Promise<{ status: string; raw?: unknown }> {
    try {
      const result = await this.nemoRequest('/avia/status', { pnr });
      return { status: result.status, raw: result };
    } catch {
      return { status: 'unknown' };
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiUrl || !this.apiKey) return false;
    try {
      await this.nemoRequest('/ping', {});
      return true;
    } catch {
      return false;
    }
  }

  // ─── Private helpers ────────────────────────────────────

  private async nemoRequest(endpoint: string, body: unknown): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Agency-ID': this.agencyId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Nemo API ${response.status}: ${text}`);
    }

    return response.json();
  }

  private findMatchingFlight(searchResult: any, airline: string, flightNumber: string): any {
    // Nemo returns flights grouped by offers
    const offers = searchResult?.flights || searchResult?.data?.flights || [];
    for (const offer of Array.isArray(offers) ? offers : []) {
      const segments = offer.segments || [];
      for (const seg of segments) {
        if (seg.airline === airline && seg.flightNumber?.includes(flightNumber)) {
          return offer;
        }
      }
    }
    return null;
  }
}
