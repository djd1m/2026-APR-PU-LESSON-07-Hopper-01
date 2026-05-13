import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateFreezeDto, CreateProtectionDto } from './fintech.dto';
import { v4 as uuidv4 } from 'uuid';

/** Money value object */
interface Money {
  amount: number;
  currency: string;
}

/** Price Drop Protection record */
interface PriceDropProtectionRecord {
  id: string;
  booking_id: string;
  user_id: string;
  booked_price: number;
  premium: Money;
  max_coverage: Money;
  status: 'ACTIVE' | 'TRIGGERED' | 'PAID_OUT' | 'EXPIRED';
  monitoring_start: Date;
  monitoring_end: Date;
  lowest_observed_price: number;
  price_checks: PriceCheckRecord[];
  refund_amount: Money | null;
  refund_at: Date | null;
  created_at: Date;
}

/** Individual price check */
interface PriceCheckRecord {
  checked_at: Date;
  price: number;
  delta: number; // difference from booked price (negative = drop)
}

@Injectable()
export class FintechService {
  private readonly logger = new Logger(FintechService.name);

  // Constants from PriceFreezeManager pseudocode
  private readonly MAX_ACTIVE_FREEZES = 3;
  private readonly FREEZE_DURATION_DAYS = 21;

  // Price Drop Protection constants (from ProtectionBundleCalculator)
  private readonly PRICE_DROP_FLAT_FEE = 1500; // RUB base
  private readonly PRICE_DROP_MIN_PREMIUM = 1000; // RUB
  private readonly PRICE_DROP_MAX_PREMIUM = 2000; // RUB (per spec: 1000-2000)
  private readonly PRICE_DROP_MONITORING_DAYS = 10;
  private readonly PRICE_DROP_MAX_REFUND_PCT = 0.50; // 50% of booking price

  // In-memory stores for MVP
  private priceDropProtections = new Map<string, PriceDropProtectionRecord>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a price freeze for a flight.
   * Fee: 2,000-3,000 RUB based on route volatility.
   * Max 3 active freezes per user. Duration: 21 days.
   */
  async createFreeze(userId: string, dto: CreateFreezeDto) {
    // TODO: Count active freezes for user
    // const activeCount = await this.prisma.priceFreeze.count({
    //   where: { userId, status: 'ACTIVE' },
    // });
    // if (activeCount >= this.MAX_ACTIVE_FREEZES) {
    //   throw new BadRequestException('Максимум 3 активных заморозки');
    // }

    // TODO: Get current flight price from supplier API
    // TODO: Calculate freeze fee based on price and route volatility
    // TODO: Create payment via YooKassa for the freeze fee
    // TODO: Save freeze record to DB
    // TODO: Send Telegram notification

    this.logger.log(
      `Creating price freeze for user ${userId}, flight ${dto.flight_id}`,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.FREEZE_DURATION_DAYS);

    return {
      freeze: {
        id: 'placeholder-freeze-id',
        flight_id: dto.flight_id,
        frozen_price: { amount: 8500, currency: 'RUB' },
        freeze_fee: { amount: 2500, currency: 'RUB' },
        status: 'active',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Get price freeze details by ID.
   */
  async getFreeze(userId: string, freezeId: string) {
    // TODO: Query Prisma with authorization check
    // const freeze = await this.prisma.priceFreeze.findFirst({
    //   where: { id: freezeId, userId },
    // });
    // if (!freeze) throw new NotFoundException('Freeze not found');

    throw new NotFoundException(`Freeze ${freezeId} not found`);
  }

  /**
   * Use an active freeze to book at the frozen price.
   * User always gets the lower of frozen vs current market price.
   */
  async useFreeze(userId: string, freezeId: string) {
    // TODO: Validate freeze is ACTIVE and not expired
    // TODO: Get current market price
    // TODO: Determine booking price = MIN(frozen, current)
    // TODO: Mark freeze as USED
    // TODO: Return price comparison

    this.logger.log(`Using freeze ${freezeId} for user ${userId}`);

    return {
      booking_price: { amount: 8500, currency: 'RUB' },
      market_price: { amount: 11000, currency: 'RUB' },
      savings: { amount: 2500, currency: 'RUB' },
      source: 'freeze_lower',
    };
  }

  /**
   * Create protections for an existing booking.
   * Supports: CFAR (via insurance partner), Price Drop, Flight Disruption.
   */
  async createProtection(userId: string, dto: CreateProtectionDto) {
    this.logger.log(
      `Creating protections ${dto.types.join(', ')} for booking ${dto.booking_id}`,
    );

    return {
      protections: dto.types.map((type) => ({
        id: `placeholder-protection-${type}`,
        booking_id: dto.booking_id,
        type,
        status: 'active',
        premium: { amount: 2000, currency: 'RUB' },
        coverage: { amount: 8500, currency: 'RUB' },
      })),
    };
  }

  // =========================================================================
  // PRICE DROP PROTECTION — 10-day post-booking price monitoring
  // =========================================================================

  /**
   * Add Price Drop Protection to an existing booking.
   *
   * Business rules (from Specification US-10 + ProtectionBundleCalculator):
   * - Premium: 1,000-2,000 RUB (based on volatility)
   * - Monitoring period: 10 days from booking
   * - Price checked every 30 minutes
   * - Auto-refund difference if price drops
   * - Max refund: 50% of booking price
   * - No claim process needed — fully automatic
   */
  async addPriceDropProtection(bookingId: string, userId: string) {
    // Check for existing active protection on this booking
    for (const prot of this.priceDropProtections.values()) {
      if (
        prot.booking_id === bookingId &&
        prot.user_id === userId &&
        prot.status === 'ACTIVE'
      ) {
        throw new BadRequestException(
          'Защита от снижения цены уже активирована для этого бронирования',
        );
      }
    }

    // Get booking price (simulated)
    const bookingPrice = await this.getBookingPrice(bookingId);
    if (!bookingPrice) {
      throw new NotFoundException('Бронирование не найдено');
    }

    // Simulate route volatility for premium calculation
    const volatility = await this.estimateRouteVolatilityForBooking(bookingId);

    // Calculate premium using ProtectionBundleCalculator formula
    const premium = this.calculatePriceDropPremium(volatility);

    // Set monitoring period: 10 days
    const now = new Date();
    const monitoringEnd = new Date(now);
    monitoringEnd.setDate(monitoringEnd.getDate() + this.PRICE_DROP_MONITORING_DAYS);

    // Maximum coverage: 50% of booking price
    const maxCoverage = Math.round(bookingPrice.amount * this.PRICE_DROP_MAX_REFUND_PCT);

    this.logger.log(
      `Adding Price Drop Protection to booking ${bookingId} for user ${userId}. ` +
        `Booked: ${bookingPrice.amount} RUB, Premium: ${premium} RUB, ` +
        `Monitoring: ${this.PRICE_DROP_MONITORING_DAYS} days, Max refund: ${maxCoverage} RUB`,
    );

    const protection: PriceDropProtectionRecord = {
      id: uuidv4(),
      booking_id: bookingId,
      user_id: userId,
      booked_price: bookingPrice.amount,
      premium: { amount: premium, currency: 'RUB' },
      max_coverage: { amount: maxCoverage, currency: 'RUB' },
      status: 'ACTIVE',
      monitoring_start: now,
      monitoring_end: monitoringEnd,
      lowest_observed_price: bookingPrice.amount,
      price_checks: [],
      refund_amount: null,
      refund_at: null,
      created_at: now,
    };

    this.priceDropProtections.set(protection.id, protection);

    return {
      protection: {
        id: protection.id,
        booking_id: protection.booking_id,
        type: 'price_drop',
        status: 'active',
        premium: protection.premium,
        coverage: protection.max_coverage,
        monitoring_start: protection.monitoring_start.toISOString(),
        monitoring_end: protection.monitoring_end.toISOString(),
        monitoring_days: this.PRICE_DROP_MONITORING_DAYS,
        booked_price: { amount: protection.booked_price, currency: 'RUB' },
        created_at: protection.created_at.toISOString(),
        terms:
          `Мониторинг цены ${this.PRICE_DROP_MONITORING_DAYS} дней после бронирования. ` +
          `Проверка каждые 30 минут. Автоматический возврат разницы. ` +
          `Макс. возврат: ${maxCoverage.toLocaleString('ru-RU')} \u20BD ` +
          `(50% стоимости билета).`,
      },
    };
  }

  /**
   * Check current price for a protected booking and auto-refund if dropped.
   *
   * This is the background job that runs every 30 minutes for active protections.
   * Called by the notification service scheduler.
   */
  async checkPriceDrop(protectionId: string): Promise<{
    checked: boolean;
    drop_detected: boolean;
    refund_amount?: number;
  }> {
    const protection = this.priceDropProtections.get(protectionId);
    if (!protection) {
      throw new NotFoundException('Защита от снижения цены не найдена');
    }

    if (protection.status !== 'ACTIVE') {
      return { checked: false, drop_detected: false };
    }

    // Check if monitoring period has ended
    if (new Date() > protection.monitoring_end) {
      protection.status = 'EXPIRED';
      this.logger.log(
        `Price Drop Protection ${protectionId} expired. ` +
          `Lowest observed: ${protection.lowest_observed_price} RUB ` +
          `(booked at ${protection.booked_price} RUB)`,
      );
      return { checked: false, drop_detected: false };
    }

    // Simulate getting the current market price for the same flight
    const currentPrice = await this.getCurrentFlightPriceForBooking(
      protection.booking_id,
    );

    // Record the price check
    const delta = currentPrice - protection.booked_price;
    protection.price_checks.push({
      checked_at: new Date(),
      price: currentPrice,
      delta,
    });

    // Track lowest observed price
    if (currentPrice < protection.lowest_observed_price) {
      protection.lowest_observed_price = currentPrice;
    }

    // Check if price dropped below booked price
    if (currentPrice < protection.booked_price) {
      const rawRefund = protection.booked_price - currentPrice;
      // Cap at max coverage (50% of booking price)
      const refundAmount = Math.min(rawRefund, protection.max_coverage.amount);

      // Only process if this is a NEW drop (or bigger drop than previous refund)
      const previousRefund = protection.refund_amount?.amount || 0;
      if (refundAmount > previousRefund) {
        protection.status = 'TRIGGERED';
        protection.refund_amount = { amount: refundAmount, currency: 'RUB' };
        protection.refund_at = new Date();

        this.logger.log(
          `Price drop detected for protection ${protectionId}! ` +
            `Booked: ${protection.booked_price}, Current: ${currentPrice}, ` +
            `Refund: ${refundAmount} RUB (user: ${protection.user_id})`,
        );

        return {
          checked: true,
          drop_detected: true,
          refund_amount: refundAmount,
        };
      }
    }

    this.logger.debug(
      `Price check for ${protectionId}: current ${currentPrice}, ` +
        `booked ${protection.booked_price}, delta ${delta}`,
    );

    return { checked: true, drop_detected: false };
  }

  /**
   * Get Price Drop Protection details for a booking.
   */
  async getPriceDropProtection(bookingId: string, userId: string) {
    for (const prot of this.priceDropProtections.values()) {
      if (prot.booking_id === bookingId && prot.user_id === userId) {
        const remainingMs = prot.monitoring_end.getTime() - Date.now();
        const remainingDays = Math.max(
          0,
          Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
        );

        return {
          protection: {
            id: prot.id,
            booking_id: prot.booking_id,
            type: 'price_drop',
            status: prot.status.toLowerCase(),
            premium: prot.premium,
            coverage: prot.max_coverage,
            booked_price: { amount: prot.booked_price, currency: 'RUB' },
            lowest_observed: {
              amount: prot.lowest_observed_price,
              currency: 'RUB',
            },
            monitoring_end: prot.monitoring_end.toISOString(),
            remaining_days: remainingDays,
            total_checks: prot.price_checks.length,
            refund_amount: prot.refund_amount,
            refund_at: prot.refund_at?.toISOString() || null,
          },
        };
      }
    }
    throw new NotFoundException(
      'Защита от снижения цены не найдена для этого бронирования',
    );
  }

  /**
   * Get all active Price Drop protections that need checking.
   * Used by the background scheduler to enumerate protections.
   */
  getActiveDropProtectionIds(): string[] {
    const ids: string[] = [];
    for (const prot of this.priceDropProtections.values()) {
      if (prot.status === 'ACTIVE' && prot.monitoring_end > new Date()) {
        ids.push(prot.id);
      }
    }
    return ids;
  }

  // =========================================================================
  // PRICE DROP PRIVATE HELPERS
  // =========================================================================

  /**
   * Calculate Price Drop premium using ProtectionBundleCalculator formula.
   *
   * Formula: PRICE_DROP_FLAT_FEE * volFactor
   * - volFactor = 1.0 + (volatility * 0.5)
   * - Clamped to 1,000-2,000 RUB (spec: 1000-2000)
   */
  private calculatePriceDropPremium(volatility: number): number {
    const volFactor = 1.0 + volatility * 0.5;
    const rawPremium = this.PRICE_DROP_FLAT_FEE * volFactor;
    return Math.round(
      Math.min(
        this.PRICE_DROP_MAX_PREMIUM,
        Math.max(this.PRICE_DROP_MIN_PREMIUM, rawPremium),
      ),
    );
  }

  /**
   * Simulate route volatility lookup for a booking.
   */
  private async estimateRouteVolatilityForBooking(
    bookingId: string,
  ): Promise<number> {
    const hash = bookingId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 0.1 + (hash % 70) / 100;
  }

  /**
   * Simulate booking price lookup.
   */
  private async getBookingPrice(
    bookingId: string,
  ): Promise<Money | null> {
    const hash = bookingId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return { amount: 5000 + (hash % 25000), currency: 'RUB' };
  }

  /**
   * Simulate getting current flight price for a booked flight.
   * In production: query FlightAPI for the same flight/route/date.
   * Price fluctuates randomly to simulate real market behavior.
   */
  private async getCurrentFlightPriceForBooking(
    bookingId: string,
  ): Promise<number> {
    const booking = await this.getBookingPrice(bookingId);
    if (!booking) return 0;

    // Simulate price fluctuation: +/- 20% from booked price
    const fluctuation = 1 + (Math.random() * 0.4 - 0.2);
    return Math.round(booking.amount * fluctuation);
  }
}
