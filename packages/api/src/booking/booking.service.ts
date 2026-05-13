import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import {
  CreateBookingDto,
  BookingResponseDto,
  CancelBookingResponseDto,
} from './booking.dto';
// Prisma enums as string literals (avoids cross-package import issues in monorepo)
const BookingStatus = { PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED' } as const;
const PaymentMethod = { MIR: 'MIR', SBP: 'SBP', TELEGRAM: 'TELEGRAM' } as const;
const ProtectionType = { CANCEL_FOR_ANY_REASON: 'CANCEL_FOR_ANY_REASON', PRICE_DROP: 'PRICE_DROP', FLIGHT_DISRUPTION: 'FLIGHT_DISRUPTION' } as const;
type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];
type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
type ProtectionType = (typeof ProtectionType)[keyof typeof ProtectionType];

/** Map DTO payment_method string to Prisma enum */
function toPaymentMethod(method: string): PaymentMethod {
  const map: Record<string, PaymentMethod> = {
    mir: PaymentMethod.MIR,
    sbp: PaymentMethod.SBP,
    telegram: PaymentMethod.TELEGRAM,
  };
  return map[method] ?? PaymentMethod.SBP;
}

/** Map DTO protection type string to Prisma enum */
function toProtectionType(type: string): ProtectionType {
  const map: Record<string, ProtectionType> = {
    cancel_for_any_reason: ProtectionType.CANCEL_FOR_ANY_REASON,
    price_drop: ProtectionType.PRICE_DROP,
    price_freeze: ProtectionType.CANCEL_FOR_ANY_REASON, // fallback
  };
  return map[type] ?? ProtectionType.PRICE_DROP;
}

/** Generate a mock 6-char alphanumeric PNR code */
function generatePnr(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
}

/** Generate a mock YooKassa-style payment ID */
function generatePaymentId(): string {
  return `yookassa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Simulate YooKassa payment: 90% success, 10% failure */
function simulatePayment(): { success: boolean; paymentId: string } {
  const paymentId = generatePaymentId();
  const success = Math.random() < 0.9;
  return { success, paymentId };
}

/** CFAR premium: ~12% of booking price, clamped 1500-5000 */
function calculateCfarPremium(flightPrice: number): number {
  const premium = Math.round(flightPrice * 0.12);
  return Math.max(1500, Math.min(5000, premium));
}

/** Price Drop premium: flat 1500 */
function calculatePriceDropPremium(): number {
  return 1500;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Find a flight by ID in Redis search cache.
   */
  private async findFlightInCache(flightId: string): Promise<any | null> {
    try {
      const keys = await this.redis.keys('search:*');
      for (const key of keys) {
        const cached = await this.redis.get(key);
        if (!cached) continue;
        const data = JSON.parse(cached);
        const flight = data.flights?.find((f: any) => f.id === flightId);
        if (flight) return flight;
      }
    } catch (err) {
      this.logger.warn(`findFlightInCache error: ${err.message}`);
    }
    return null;
  }

  /**
   * Create a new booking with passengers, payment simulation, and protections.
   * Follows the BookingOrchestrator flow from Pseudocode.md.
   */
  async createBooking(
    userId: string,
    dto: CreateBookingDto,
  ): Promise<{ booking: BookingResponseDto }> {
    this.logger.log(
      `Creating booking for user ${userId}, flight ${dto.flight_id}`,
    );

    // Step 1: Find flight in Redis cache (mock flights are not in DB)
    const flight = await this.findFlightInCache(dto.flight_id);

    if (!flight) {
      throw new ConflictException(
        'Рейс больше недоступен. Найдены похожие варианты.',
      );
    }

    // Step 2: Determine final flight price
    let flightPrice = Number(flight.price);

    // Check active price freeze if provided
    if (dto.freeze_id) {
      const freeze = await this.prisma.priceFreeze.findFirst({
        where: {
          id: dto.freeze_id,
          user_id: userId,
          status: 'ACTIVE',
        },
      });

      if (freeze && freeze.expires_at > new Date()) {
        // User always gets the lower of frozen vs current price
        const frozenPrice = Number(freeze.frozen_price);
        flightPrice = Math.min(flightPrice, frozenPrice);

        // Mark freeze as used
        await this.prisma.priceFreeze.update({
          where: { id: dto.freeze_id },
          data: { status: 'USED', used_at: new Date() },
        });
      }
    }

    // Step 3: Calculate protection costs
    let protectionTotal = 0;
    const protectionDetails: Array<{
      type: ProtectionType;
      premium: number;
      coverage: number;
    }> = [];

    if (dto.protections && dto.protections.length > 0) {
      for (const prot of dto.protections) {
        const protType = toProtectionType(prot.type);
        let premium = 0;
        let coverage = 0;

        if (prot.type === 'cancel_for_any_reason') {
          premium = calculateCfarPremium(flightPrice);
          coverage = flightPrice; // full booking price refund
        } else if (prot.type === 'price_drop') {
          premium = calculatePriceDropPremium();
          coverage = Math.round(flightPrice * 0.5); // max 50% of booking price
        }

        protectionTotal += premium;
        protectionDetails.push({ type: protType, premium, coverage });
      }
    }

    // Step 4: Calculate total
    const totalPrice = flightPrice + protectionTotal;

    // Step 5: Simulate YooKassa payment
    const paymentResult = simulatePayment();

    if (!paymentResult.success) {
      throw new BadRequestException(
        'Оплата не прошла. Попробуйте другой способ оплаты.',
      );
    }

    // Step 6: Generate PNR (mock: 6-char alphanumeric)
    const pnr = generatePnr();

    // Step 7: Create Booking + BookingItem + Passengers in a transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          user_id: userId,
          type: 'FLIGHT',
          status: BookingStatus.CONFIRMED,
          total_price: totalPrice,
          currency: 'RUB',
          payment_id: paymentResult.paymentId,
          payment_method: toPaymentMethod(dto.payment_method),
          pnr,
          confirmed_at: new Date(),
        },
      });

      // Create booking item
      await tx.bookingItem.create({
        data: {
          booking_id: newBooking.id,
          flight_id: flight.id,
          price: flightPrice,
          currency: 'RUB',
        },
      });

      // Create passengers
      for (const passenger of dto.passengers) {
        await tx.passenger.create({
          data: {
            booking_id: newBooking.id,
            first_name: passenger.first_name,
            last_name: passenger.last_name,
            passport_number: passenger.passport_number,
            date_of_birth: new Date(passenger.date_of_birth),
            nationality: passenger.nationality,
          },
        });
      }

      // Create protections
      for (const protDetail of protectionDetails) {
        await tx.protection.create({
          data: {
            booking_id: newBooking.id,
            type: protDetail.type,
            premium_paid: protDetail.premium,
            status: 'ACTIVE',
          },
        });
      }

      // Note: available_seats not decremented (mock flights in Redis, not DB)

      return newBooking;
    });

    // Step 8: Queue confirmation notification (mock: log it)
    this.logger.log(
      `Booking ${booking.id} confirmed. PNR: ${pnr}. Notification queued.`,
    );

    // Build response
    const response: BookingResponseDto = {
      id: booking.id,
      status: 'confirmed',
      pnr,
      total_price: { amount: totalPrice, currency: 'RUB' },
      breakdown: {
        flight: { amount: flightPrice, currency: 'RUB' },
        protections: { amount: protectionTotal, currency: 'RUB' },
      },
      flights: [
        {
          id: flight.id,
          airline: flight.airline,
          flight_number: flight.flight_number,
          origin: flight.origin,
          destination: flight.destination,
          departure_at: String(flight.departure_at),
          arrival_at: String(flight.arrival_at),
          price: { amount: flightPrice, currency: 'RUB' },
        },
      ],
      passengers: dto.passengers.map((p) => ({
        first_name: p.first_name,
        last_name: p.last_name,
        passport_number: p.passport_number,
        date_of_birth: p.date_of_birth,
        nationality: p.nationality,
      })),
      protections: protectionDetails.map((pd) => ({
        type: pd.type,
        status: 'active',
        premium: { amount: pd.premium, currency: 'RUB' },
        coverage: { amount: pd.coverage, currency: 'RUB' },
      })),
      created_at: booking.created_at.toISOString(),
      confirmed_at: booking.confirmed_at?.toISOString() ?? null,
    };

    return { booking: response };
  }

  /**
   * List all bookings for a user with items, passengers, protections.
   */
  async getBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { user_id: userId },
      include: {
        items: {
          // flight relation removed (mock flights in Redis)
        },
        passengers: true,
        protections: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status.toLowerCase(),
        pnr: b.pnr,
        total_price: { amount: Number(b.total_price), currency: b.currency },
        flights: b.items
          .filter((item) => item.flight_id)
          .map((item) => {
            // Parse flight info from ID: "tp-SU-1132-2026-07-15T17:45:00+03:00" or mock UUID
            const parts = (item.flight_id || '').split('-');
            const airline = parts.length > 1 ? parts[1] : 'XX';
            const flightNum = parts.length > 2 ? `${parts[1]}-${parts[2]}` : item.flight_id || '';
            return {
              id: item.flight_id,
              airline,
              flight_number: flightNum,
              origin: 'N/A',
              destination: 'N/A',
              departure_at: parts.length > 3 ? parts.slice(3).join('-') : '',
              arrival_at: '',
              price: { amount: Number(item.price), currency: item.currency },
            };
          }),
        passengers: b.passengers.map((p) => ({
          first_name: p.first_name,
          last_name: p.last_name,
          passport_number: p.passport_number,
          date_of_birth: p.date_of_birth.toISOString().split('T')[0],
          nationality: p.nationality,
        })),
        protections: b.protections.map((pr) => ({
          type: pr.type,
          status: pr.status.toLowerCase(),
          premium: { amount: Number(pr.premium_paid), currency: 'RUB' },
        })),
        created_at: b.created_at.toISOString(),
        confirmed_at: b.confirmed_at?.toISOString() ?? null,
        cancelled_at: b.cancelled_at?.toISOString() ?? null,
      })),
    };
  }

  /**
   * Get a single booking by ID with full details.
   */
  async getBookingById(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, user_id: userId },
      include: {
        items: {
          // flight relation removed (mock flights in Redis)
        },
        passengers: true,
        protections: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        `Бронирование не найдено`,
      );
    }

    return {
      booking: {
        id: booking.id,
        status: booking.status.toLowerCase(),
        pnr: booking.pnr,
        total_price: {
          amount: Number(booking.total_price),
          currency: booking.currency,
        },
        payment_method: booking.payment_method?.toLowerCase() ?? null,
        flights: booking.items
          .filter((item) => item.flight_id)
          .map((item) => {
            const parts = (item.flight_id || '').split('-');
            const airline = parts.length > 1 ? parts[1] : 'XX';
            const flightNum = parts.length > 2 ? `${parts[1]}-${parts[2]}` : item.flight_id || '';
            return {
              id: item.flight_id,
              airline,
              flight_number: flightNum,
              origin: 'N/A',
              destination: 'N/A',
              departure_at: parts.length > 3 ? parts.slice(3).join('-') : '',
              arrival_at: '',
              duration_min: 0,
              price: { amount: Number(item.price), currency: item.currency },
            };
          }),
        passengers: booking.passengers.map((p) => ({
          first_name: p.first_name,
          last_name: p.last_name,
          passport_number: p.passport_number,
          date_of_birth: p.date_of_birth.toISOString().split('T')[0],
          nationality: p.nationality,
        })),
        protections: booking.protections.map((pr) => ({
          id: pr.id,
          type: pr.type,
          status: pr.status.toLowerCase(),
          premium: { amount: Number(pr.premium_paid), currency: 'RUB' },
          claim_amount: pr.claim_amount
            ? { amount: Number(pr.claim_amount), currency: 'RUB' }
            : null,
        })),
        created_at: booking.created_at.toISOString(),
        confirmed_at: booking.confirmed_at?.toISOString() ?? null,
        cancelled_at: booking.cancelled_at?.toISOString() ?? null,
        cancellation_reason: booking.cancellation_reason,
      },
    };
  }

  /**
   * Cancel a booking. Check for CFAR protection for full refund,
   * otherwise apply airline cancellation policy (mock: 50% refund).
   */
  async cancelBooking(
    userId: string,
    bookingId: string,
    reason?: string,
  ): Promise<{ cancellation: CancelBookingResponseDto }> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, user_id: userId },
      include: { protections: true },
    });

    if (!booking) {
      throw new NotFoundException('Бронирование не найдено');
    }

    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Отмена возможна только для подтверждённых бронирований.',
      );
    }

    // Check if CFAR protection is active
    const cfarProtection = booking.protections.find(
      (p) =>
        p.type === ProtectionType.CANCEL_FOR_ANY_REASON &&
        p.status === 'ACTIVE',
    );

    const totalPrice = Number(booking.total_price);
    let refundAmount: number;
    let cfarUsed = false;
    let processingDays: number;

    if (cfarProtection) {
      // CFAR active: full refund of booking price (excluding CFAR premium)
      const cfarPremium = Number(cfarProtection.premium_paid);
      refundAmount = totalPrice - cfarPremium;
      cfarUsed = true;
      processingDays = 5;

      // Mark CFAR protection as claimed/paid out
      await this.prisma.protection.update({
        where: { id: cfarProtection.id },
        data: {
          status: 'PAID_OUT',
          claim_amount: refundAmount,
        },
      });
    } else {
      // No CFAR: apply airline cancellation policy (mock: 50% refund)
      refundAmount = Math.round(totalPrice * 0.5);
      processingDays = 10;
    }

    // Void any remaining active protections
    await this.prisma.protection.updateMany({
      where: {
        booking_id: bookingId,
        status: 'ACTIVE',
      },
      data: { status: 'VOIDED' },
    });

    // Update booking status to CANCELLED
    const now = new Date();
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelled_at: now,
        cancellation_reason: reason ?? null,
      },
    });

    this.logger.log(
      `Booking ${bookingId} cancelled. Refund: ${refundAmount} RUB. CFAR used: ${cfarUsed}`,
    );

    const cancellation: CancelBookingResponseDto = {
      booking_id: bookingId,
      status: 'cancelled',
      refund_amount: { amount: refundAmount, currency: 'RUB' },
      refund_method: booking.payment_method?.toLowerCase() ?? 'original',
      processing_days: processingDays,
      cfar_used: cfarUsed,
      cancelled_at: now.toISOString(),
    };

    return { cancellation };
  }
}
