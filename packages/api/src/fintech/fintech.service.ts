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

/** CFAR Protection record */
interface CfarProtectionRecord {
  id: string;
  booking_id: string;
  user_id: string;
  booking_price: number;
  premium: Money;
  coverage: Money;
  status: 'ACTIVE' | 'CLAIMED' | 'PAID_OUT' | 'EXPIRED' | 'VOIDED';
  partner: string;
  partner_policy: string;
  departure_at: Date;
  valid_until: Date;
  created_at: Date;
  claimed_at: Date | null;
  payout_amount: Money | null;
  payout_at: Date | null;
}

@Injectable()
export class FintechService {
  private readonly logger = new Logger(FintechService.name);

  // Constants from PriceFreezeManager pseudocode
  private readonly MAX_ACTIVE_FREEZES = 3;
  private readonly FREEZE_DURATION_DAYS = 21;

  // CFAR constants from ProtectionBundleCalculator
  private readonly CFAR_BASE_RATE = 0.12; // 12% base
  private readonly CFAR_MIN_PREMIUM = 1500; // RUB
  private readonly CFAR_MAX_PREMIUM = 5000; // RUB
  private readonly CFAR_MIN_HOURS_BEFORE_DEPARTURE = 24;
  private readonly CFAR_PARTNER = 'АльфаСтрахование';

  // In-memory store for MVP
  private cfarProtections = new Map<string, CfarProtectionRecord>();

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
  // CFAR — Cancel For Any Reason Protection
  // =========================================================================

  /**
   * Add CFAR protection to an existing booking.
   *
   * Business rules (from Specification US-09 + ProtectionBundleCalculator):
   * - Premium: 15-20% of booking price (clamped 1,500-5,000 RUB)
   * - Coverage: 100% of booking price refund
   * - Must cancel 24h+ before departure
   * - Provided through licensed insurance partner (АльфаСтрахование)
   * - CFAR premium fee is non-refundable
   */
  async addCfarProtection(bookingId: string, userId: string) {
    // Check if CFAR already exists for this booking
    for (const prot of this.cfarProtections.values()) {
      if (
        prot.booking_id === bookingId &&
        prot.user_id === userId &&
        prot.status === 'ACTIVE'
      ) {
        throw new BadRequestException(
          'CFAR-защита уже активирована для этого бронирования',
        );
      }
    }

    // Simulate fetching booking details (in production: Prisma query)
    const bookingPrice = await this.getBookingPrice(bookingId);
    if (!bookingPrice) {
      throw new NotFoundException('Бронирование не найдено');
    }

    // Simulate departure date (in production: from booking record)
    const departureAt = new Date();
    departureAt.setDate(departureAt.getDate() + 14); // Default: 14 days out

    // Calculate CFAR premium using ProtectionBundleCalculator formula
    const premium = this.calculateCfarPremium(
      bookingPrice.amount,
      departureAt,
    );

    // Simulate activating policy with insurance partner
    const policyNumber = `CFAR-${uuidv4().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `Adding CFAR protection to booking ${bookingId} for user ${userId}. ` +
        `Booking: ${bookingPrice.amount} RUB, Premium: ${premium} RUB, ` +
        `Partner: ${this.CFAR_PARTNER}, Policy: ${policyNumber}`,
    );

    const protection: CfarProtectionRecord = {
      id: uuidv4(),
      booking_id: bookingId,
      user_id: userId,
      booking_price: bookingPrice.amount,
      premium: { amount: premium, currency: 'RUB' },
      coverage: { amount: bookingPrice.amount, currency: 'RUB' },
      status: 'ACTIVE',
      partner: this.CFAR_PARTNER,
      partner_policy: policyNumber,
      departure_at: departureAt,
      valid_until: departureAt, // Valid until departure
      created_at: new Date(),
      claimed_at: null,
      payout_amount: null,
      payout_at: null,
    };

    this.cfarProtections.set(protection.id, protection);

    return {
      protection: {
        id: protection.id,
        booking_id: protection.booking_id,
        type: 'cancel_for_any_reason',
        status: 'active',
        premium: protection.premium,
        coverage: protection.coverage,
        partner: protection.partner,
        partner_policy: protection.partner_policy,
        valid_until: protection.valid_until.toISOString(),
        created_at: protection.created_at.toISOString(),
        terms:
          'Отмена по любой причине. Полный возврат стоимости билета. ' +
          'Действует до момента вылета. Отмена не позднее чем за 24 часа до вылета. ' +
          'Возврат в течение 5 рабочих дней. Стоимость защиты не возвращается.',
      },
    };
  }

  /**
   * Claim CFAR protection — initiate 100% refund of booking price.
   *
   * Validation rules:
   * - Protection must be ACTIVE
   * - Must be 24h+ before departure
   * - CFAR premium is NOT refunded (only booking price)
   */
  async claimCfar(protectionId: string, userId: string) {
    const protection = this.cfarProtections.get(protectionId);
    if (!protection || protection.user_id !== userId) {
      throw new NotFoundException('Защита не найдена');
    }

    if (protection.status !== 'ACTIVE') {
      const statusMessages: Record<string, string> = {
        CLAIMED: 'Заявка на возврат уже подана',
        PAID_OUT: 'Возврат уже выплачен',
        EXPIRED: 'Срок защиты истёк (рейс вылетел)',
        VOIDED: 'Защита аннулирована',
      };
      throw new BadRequestException(
        statusMessages[protection.status] || 'Защита неактивна',
      );
    }

    // Validate: must be 24h+ before departure
    const hoursUntilDeparture =
      (protection.departure_at.getTime() - Date.now()) / (60 * 60 * 1000);

    if (hoursUntilDeparture < this.CFAR_MIN_HOURS_BEFORE_DEPARTURE) {
      throw new BadRequestException(
        `Отмена по CFAR возможна не позднее чем за ${this.CFAR_MIN_HOURS_BEFORE_DEPARTURE} часа до вылета. ` +
          `До вылета осталось ${Math.round(hoursUntilDeparture)} часов.`,
      );
    }

    // Process claim — initiate 100% refund of booking price
    protection.status = 'CLAIMED';
    protection.claimed_at = new Date();
    protection.payout_amount = {
      amount: protection.booking_price,
      currency: 'RUB',
    };

    // Estimated payout: 5 business days
    const payoutDate = new Date();
    payoutDate.setDate(payoutDate.getDate() + 7); // ~5 business days

    this.logger.log(
      `CFAR claim processed for protection ${protectionId}, user ${userId}. ` +
        `Refund: ${protection.booking_price} RUB. ` +
        `Partner: ${protection.partner}, Policy: ${protection.partner_policy}`,
    );

    return {
      claim: {
        id: `claim-${uuidv4().slice(0, 8)}`,
        protection_id: protection.id,
        protection_type: 'cancel_for_any_reason',
        status: 'approved',
        payout_amount: protection.payout_amount,
        estimated_payout_date: payoutDate.toISOString().split('T')[0],
        refund_method: 'original_payment',
        partner: protection.partner,
        partner_policy: protection.partner_policy,
        message:
          `Полный возврат: ${protection.booking_price.toLocaleString('ru-RU')} \u20BD ` +
          `на ваш счёт в течение 5 рабочих дней. ` +
          `Страховой полис: ${protection.partner_policy} (${protection.partner}).`,
      },
    };
  }

  /**
   * Get CFAR protection details for a booking.
   */
  async getCfarProtection(bookingId: string, userId: string) {
    for (const prot of this.cfarProtections.values()) {
      if (prot.booking_id === bookingId && prot.user_id === userId) {
        const hoursUntilDeparture =
          (prot.departure_at.getTime() - Date.now()) / (60 * 60 * 1000);

        return {
          protection: {
            id: prot.id,
            booking_id: prot.booking_id,
            type: 'cancel_for_any_reason',
            status: prot.status.toLowerCase(),
            premium: prot.premium,
            coverage: prot.coverage,
            partner: prot.partner,
            partner_policy: prot.partner_policy,
            valid_until: prot.valid_until.toISOString(),
            created_at: prot.created_at.toISOString(),
            claimed_at: prot.claimed_at?.toISOString() || null,
            payout_amount: prot.payout_amount,
            can_claim:
              prot.status === 'ACTIVE' &&
              hoursUntilDeparture >= this.CFAR_MIN_HOURS_BEFORE_DEPARTURE,
            hours_until_deadline: Math.max(
              0,
              Math.round(
                hoursUntilDeparture - this.CFAR_MIN_HOURS_BEFORE_DEPARTURE,
              ),
            ),
          },
        };
      }
    }
    throw new NotFoundException('CFAR-защита не найдена для этого бронирования');
  }

  // =========================================================================
  // CFAR PRIVATE HELPERS
  // =========================================================================

  /**
   * Calculate CFAR premium using ProtectionBundleCalculator formula.
   *
   * Formula: bookingPrice * CFAR_BASE_RATE * timeFactor * routeRisk
   * - timeFactor: 1.0 (>30 days), 1.2 (14-30), 1.5 (<14)
   * - routeRisk: 0.8-1.3 (simulated)
   * - Clamped to 1,500-5,000 RUB
   *
   * Effective rate: ~15-20% of booking price
   */
  private calculateCfarPremium(
    bookingPriceAmount: number,
    departureDate: Date,
  ): number {
    const daysOut = Math.floor(
      (departureDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );

    // Time factor: closer to departure = higher premium
    let timeFactor: number;
    if (daysOut > 30) {
      timeFactor = 1.0;
    } else if (daysOut > 14) {
      timeFactor = 1.2;
    } else {
      timeFactor = 1.5;
    }

    // Simulated route cancellation risk (in production: historical data)
    const routeRisk = 0.9 + Math.random() * 0.4; // 0.9 - 1.3

    const rawPremium =
      bookingPriceAmount * this.CFAR_BASE_RATE * timeFactor * routeRisk;

    return Math.round(
      Math.min(this.CFAR_MAX_PREMIUM, Math.max(this.CFAR_MIN_PREMIUM, rawPremium)),
    );
  }

  /**
   * Simulate fetching booking price (in production: Prisma query).
   */
  private async getBookingPrice(bookingId: string): Promise<Money | null> {
    const hash = bookingId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Booking price between 5,000 and 30,000 RUB
    return {
      amount: 5000 + (hash % 25000),
      currency: 'RUB',
    };
  }
}
