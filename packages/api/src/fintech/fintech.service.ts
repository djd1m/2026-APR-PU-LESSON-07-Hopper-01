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

/** In-memory freeze record (replaced by Prisma in production) */
interface PriceFreezeRecord {
  id: string;
  user_id: string;
  flight_id: string;
  frozen_price: Money;
  freeze_fee: Money;
  fee_payment_id: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  expires_at: Date;
  created_at: Date;
  used_at: Date | null;
  booking_id: string | null;
}

@Injectable()
export class FintechService {
  private readonly logger = new Logger(FintechService.name);

  // === PriceFreezeManager constants (from Pseudocode.md) ===
  private readonly MAX_ACTIVE_FREEZES = 3;
  private readonly FREEZE_DURATION_DAYS = 21;
  private readonly MIN_FREEZE_FEE = 2000; // RUB
  private readonly MAX_FREEZE_FEE = 3000; // RUB

  // In-memory stores for MVP (replaced by Prisma tables in production)
  private freezes = new Map<string, PriceFreezeRecord>();

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // PRICE FREEZE — Full PriceFreezeManager implementation
  // =========================================================================

  /**
   * Create a price freeze for a flight.
   *
   * Business rules (from PriceFreezeManager pseudocode):
   * - Max 3 active freezes per user
   * - Fee: 2,000-3,000 RUB based on price tier and route volatility
   * - Duration: 21 days from creation
   * - Fee is non-refundable unless flight sold out
   */
  async createFreeze(userId: string, dto: CreateFreezeDto) {
    // Validate: max 3 active freezes per user
    const activeCount = this.countActiveFreezes(userId);
    if (activeCount >= this.MAX_ACTIVE_FREEZES) {
      throw new BadRequestException(
        'Максимум 3 активных заморозки. Дождитесь истечения или используйте существующие.',
      );
    }

    // Get current flight price (simulated — in production this calls FlightAPI)
    const flightPrice = await this.getFlightPrice(dto.flight_id);
    if (!flightPrice) {
      throw new BadRequestException('Рейс недоступен для заморозки');
    }

    // Calculate freeze fee based on price and estimated volatility
    const volatility = await this.estimateRouteVolatility(dto.flight_id);
    const freezeFee = this.calculateFreezeFee(flightPrice.amount, volatility);

    // Simulate payment via YooKassa (in production, create real payment)
    const paymentId = `pay_freeze_${uuidv4().slice(0, 8)}`;

    this.logger.log(
      `Creating price freeze for user ${userId}, flight ${dto.flight_id}, ` +
        `price ${flightPrice.amount} RUB, fee ${freezeFee} RUB`,
    );

    // Create freeze record
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.FREEZE_DURATION_DAYS);

    const freeze: PriceFreezeRecord = {
      id: uuidv4(),
      user_id: userId,
      flight_id: dto.flight_id,
      frozen_price: { amount: flightPrice.amount, currency: 'RUB' },
      freeze_fee: { amount: freezeFee, currency: 'RUB' },
      fee_payment_id: paymentId,
      status: 'ACTIVE',
      expires_at: expiresAt,
      created_at: now,
      used_at: null,
      booking_id: null,
    };

    this.freezes.set(freeze.id, freeze);

    const remainingDays = this.FREEZE_DURATION_DAYS;

    return {
      freeze: {
        id: freeze.id,
        flight_id: freeze.flight_id,
        frozen_price: freeze.frozen_price,
        freeze_fee: freeze.freeze_fee,
        status: 'active',
        expires_at: freeze.expires_at.toISOString(),
        created_at: freeze.created_at.toISOString(),
        remaining_days: remainingDays,
      },
    };
  }

  /**
   * Use an active freeze to book at the frozen price.
   * User always gets the LOWER of frozen vs current market price.
   */
  async useFreeze(userId: string, freezeId: string) {
    const freeze = this.freezes.get(freezeId);
    if (!freeze || freeze.user_id !== userId) {
      throw new NotFoundException('Заморозка не найдена');
    }

    if (freeze.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Заморозка уже ${freeze.status === 'USED' ? 'использована' : freeze.status === 'EXPIRED' ? 'истекла' : 'отменена'}`,
      );
    }

    // Check expiration
    if (freeze.expires_at < new Date()) {
      freeze.status = 'EXPIRED';
      throw new BadRequestException(
        `Заморозка истекла ${freeze.expires_at.toLocaleDateString('ru-RU')}`,
      );
    }

    // Get current market price
    const currentPrice = await this.getFlightPrice(freeze.flight_id);
    if (!currentPrice) {
      throw new BadRequestException('Рейс больше недоступен');
    }

    // User ALWAYS gets the lower of frozen vs current
    const bookingPrice = Math.min(freeze.frozen_price.amount, currentPrice.amount);
    const source =
      freeze.frozen_price.amount <= currentPrice.amount
        ? 'freeze_lower'
        : 'market_lower';

    const savings = Math.abs(currentPrice.amount - freeze.frozen_price.amount);

    // Mark freeze as used
    freeze.status = 'USED';
    freeze.used_at = new Date();

    this.logger.log(
      `Freeze ${freezeId} used by user ${userId}. ` +
        `Frozen: ${freeze.frozen_price.amount}, Current: ${currentPrice.amount}, ` +
        `Booking at: ${bookingPrice} (${source}), Savings: ${savings}`,
    );

    return {
      booking_price: { amount: bookingPrice, currency: 'RUB' },
      market_price: currentPrice,
      frozen_price: freeze.frozen_price,
      savings: { amount: savings, currency: 'RUB' },
      source,
    };
  }

  /**
   * Get price freeze details with remaining days calculation.
   */
  async getFreeze(userId: string, freezeId: string) {
    const freeze = this.freezes.get(freezeId);
    if (!freeze || freeze.user_id !== userId) {
      throw new NotFoundException('Заморозка не найдена');
    }

    // Auto-expire if past expiration date
    if (freeze.status === 'ACTIVE' && freeze.expires_at < new Date()) {
      freeze.status = 'EXPIRED';
    }

    const remainingMs = freeze.expires_at.getTime() - Date.now();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

    // Get current market price for comparison
    let currentPrice: Money | null = null;
    if (freeze.status === 'ACTIVE') {
      currentPrice = await this.getFlightPrice(freeze.flight_id);
    }

    return {
      freeze: {
        id: freeze.id,
        flight_id: freeze.flight_id,
        frozen_price: freeze.frozen_price,
        freeze_fee: freeze.freeze_fee,
        status: freeze.status.toLowerCase(),
        expires_at: freeze.expires_at.toISOString(),
        created_at: freeze.created_at.toISOString(),
        used_at: freeze.used_at?.toISOString() || null,
        remaining_days: remainingDays,
        current_market_price: currentPrice,
      },
    };
  }

  /**
   * Expire a freeze (called by background job or scheduler).
   * Marks ACTIVE freezes past their expiry as EXPIRED.
   */
  async expireFreeze(freezeId: string): Promise<void> {
    const freeze = this.freezes.get(freezeId);
    if (!freeze || freeze.status !== 'ACTIVE') return;

    freeze.status = 'EXPIRED';
    this.logger.log(`Freeze ${freezeId} expired for user ${freeze.user_id}`);
  }

  /**
   * Refund a freeze fee when the flight is sold out.
   * This is the ONLY case where the fee is refundable.
   */
  async refundFreeze(freezeId: string): Promise<void> {
    const freeze = this.freezes.get(freezeId);
    if (!freeze) {
      throw new NotFoundException('Заморозка не найдена');
    }

    if (freeze.status !== 'ACTIVE' && freeze.status !== 'EXPIRED') {
      throw new BadRequestException(
        'Возврат возможен только для активных или истекших заморозок',
      );
    }

    // Verify flight is actually sold out
    const flightPrice = await this.getFlightPrice(freeze.flight_id);
    if (flightPrice) {
      throw new BadRequestException(
        'Возврат возможен только если рейс полностью распродан',
      );
    }

    freeze.status = 'REFUNDED';

    this.logger.log(
      `Freeze ${freezeId} refunded for user ${freeze.user_id}, ` +
        `fee ${freeze.freeze_fee.amount} RUB (flight sold out)`,
    );
  }

  /**
   * Background job: expire all stale freezes.
   * Runs every hour via cron.
   */
  async expireStaleFreezes(): Promise<number> {
    const now = new Date();
    let expiredCount = 0;

    for (const freeze of this.freezes.values()) {
      if (freeze.status === 'ACTIVE' && freeze.expires_at < now) {
        freeze.status = 'EXPIRED';
        expiredCount++;
        this.logger.log(`Auto-expired freeze ${freeze.id} for user ${freeze.user_id}`);
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} stale freezes`);
    }

    return expiredCount;
  }

  /**
   * Get all freezes for a user.
   */
  async getUserFreezes(userId: string) {
    // Auto-expire stale ones first
    const now = new Date();
    const userFreezes: PriceFreezeRecord[] = [];

    for (const freeze of this.freezes.values()) {
      if (freeze.user_id === userId) {
        if (freeze.status === 'ACTIVE' && freeze.expires_at < now) {
          freeze.status = 'EXPIRED';
        }
        userFreezes.push(freeze);
      }
    }

    return {
      freezes: userFreezes
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .map((f) => {
          const remainingMs = f.expires_at.getTime() - Date.now();
          const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
          return {
            id: f.id,
            flight_id: f.flight_id,
            frozen_price: f.frozen_price,
            freeze_fee: f.freeze_fee,
            status: f.status.toLowerCase(),
            expires_at: f.expires_at.toISOString(),
            created_at: f.created_at.toISOString(),
            remaining_days: remainingDays,
          };
        }),
      active_count: userFreezes.filter((f) => f.status === 'ACTIVE').length,
      max_allowed: this.MAX_ACTIVE_FREEZES,
    };
  }

  // =========================================================================
  // PROTECTION — Placeholder (implemented in feature/009 and feature/010)
  // =========================================================================

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
  // PRIVATE HELPERS
  // =========================================================================

  /**
   * Calculate freeze fee based on price and volatility.
   * Formula from PriceFreezeManager pseudocode:
   *   base_pct = 0.03 + (volatility * 0.02)  // 3% + up to 2% volatility premium
   *   fee = price * base_pct
   *   CLAMP(fee, MIN_FREEZE_FEE, MAX_FREEZE_FEE)
   */
  private calculateFreezeFee(priceAmount: number, volatility: number): number {
    const basePct = 0.03 + volatility * 0.02;
    const rawFee = priceAmount * basePct;
    return Math.round(
      Math.min(this.MAX_FREEZE_FEE, Math.max(this.MIN_FREEZE_FEE, rawFee)),
    );
  }

  /**
   * Count active freezes for a user.
   */
  private countActiveFreezes(userId: string): number {
    let count = 0;
    const now = new Date();
    for (const freeze of this.freezes.values()) {
      if (freeze.user_id === userId && freeze.status === 'ACTIVE') {
        if (freeze.expires_at >= now) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Get current flight price from supplier API.
   * In production this calls the FlightAPI service.
   * Returns null if flight is sold out or unavailable.
   */
  private async getFlightPrice(flightId: string): Promise<Money | null> {
    // Simulate realistic price lookup with some variance
    // In production: const flight = await this.flightApi.getFlight(flightId);
    const hash = flightId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Base price between 5,000 and 25,000 RUB
    const basePrice = 5000 + (hash % 20000);

    // Add time-based variance (+/- 15%)
    const dayOfYear = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const variance = 1 + ((dayOfYear + hash) % 30 - 15) / 100;

    return {
      amount: Math.round(basePrice * variance),
      currency: 'RUB',
    };
  }

  /**
   * Estimate route volatility (0.0 = stable, 1.0 = very volatile).
   * In production this queries PriceHistory over a 30-day window.
   */
  private async estimateRouteVolatility(flightId: string): Promise<number> {
    // Simulate volatility based on flight characteristics
    const hash = flightId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Return volatility between 0.1 and 0.8
    return 0.1 + (hash % 70) / 100;
  }
}
