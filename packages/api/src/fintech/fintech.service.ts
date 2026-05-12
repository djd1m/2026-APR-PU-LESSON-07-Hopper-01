import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateFreezeDto, CreateProtectionDto } from './fintech.dto';

@Injectable()
export class FintechService {
  private readonly logger = new Logger(FintechService.name);

  // Constants from PriceFreezeManager pseudocode
  private readonly MAX_ACTIVE_FREEZES = 3;
  private readonly FREEZE_DURATION_DAYS = 21;

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
    // TODO: Validate booking exists and belongs to user
    // TODO: Calculate premiums via ProtectionBundleCalculator
    // TODO: Activate with insurance partner if CFAR
    // TODO: Start price monitoring if Price Drop
    // TODO: Create payment for premiums via YooKassa
    // TODO: Save protection records to DB

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
}
