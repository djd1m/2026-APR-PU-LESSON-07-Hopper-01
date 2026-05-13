import { Injectable, Logger } from '@nestjs/common';
import {
  BookingProvider,
  BookingRequest,
  BookingResult,
  CancelResult,
} from './booking-provider.interface';

/**
 * Mock booking provider — simulates GDS booking.
 * Used when BOOKING_PROVIDER=mock (default) or no real GDS connected.
 *
 * - 90% success rate (simulates payment)
 * - Random PNR generation (6-char alphanumeric)
 * - No real airline reservation created
 */
@Injectable()
export class MockBookingProvider implements BookingProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockBookingProvider.name);

  async createBooking(request: BookingRequest): Promise<BookingResult> {
    this.logger.log(`[MOCK] Creating booking: ${request.airline} ${request.flight_number} for ${request.passengers.length} pax`);

    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    const pnr = this.generatePNR();
    const paymentId = `mock-pay-${Date.now()}`;

    if (!success) {
      return {
        success: false,
        pnr: '',
        payment_id: paymentId,
        status: 'failed',
        error: 'Оплата не прошла. Попробуйте другой способ оплаты.',
      };
    }

    this.logger.log(`[MOCK] Booking confirmed: PNR=${pnr}, payment=${paymentId}`);

    return {
      success: true,
      pnr,
      payment_id: paymentId,
      status: 'confirmed',
      raw_response: { mock: true, timestamp: new Date().toISOString() },
    };
  }

  async cancelBooking(pnr: string): Promise<CancelResult> {
    this.logger.log(`[MOCK] Cancelling booking: PNR=${pnr}`);
    return {
      success: true,
      refund_amount: 0, // Will be calculated by booking service based on CFAR
      refund_currency: 'RUB',
      processing_days: 5,
    };
  }

  async getBookingStatus(pnr: string): Promise<{ status: string }> {
    return { status: 'confirmed' };
  }

  async isAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  private generatePNR(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
