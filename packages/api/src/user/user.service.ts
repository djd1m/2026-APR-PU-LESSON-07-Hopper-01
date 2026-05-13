import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MAX_ALERTS_PER_USER } from '@hopperru/shared';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get authenticated user's profile.
   */
  async getProfile(userId: string) {
    // TODO: Query Prisma for user with preferences
    // const user = await this.prisma.user.findUnique({
    //   where: { id: userId },
    //   include: { preferences: true },
    // });
    // if (!user) throw new NotFoundException('User not found');

    return {
      id: userId,
      name: 'Placeholder User',
      telegram_id: null,
      email: null,
      phone: null,
      home_airport: 'SVO',
      preferences: {
        currency: 'RUB',
        timezone: 'Europe/Moscow',
        language: 'ru',
        notification_channels: {},
      },
    };
  }

  /**
   * Update user profile fields.
   */
  async updateProfile(userId: string, updates: Record<string, unknown>) {
    // TODO: Validate and apply updates via Prisma
    // const user = await this.prisma.user.update({
    //   where: { id: userId },
    //   data: updates,
    // });

    this.logger.log(`Updating profile for user ${userId}`);
    return { id: userId, ...updates, updated_at: new Date().toISOString() };
  }

  /**
   * Get cumulative savings from predictions and freezes.
   */
  async getSavings(userId: string) {
    // TODO: Aggregate savings from bookings where freeze or prediction saved money
    // TODO: Calculate total saved from Price Drop protections
    // TODO: Sum freeze savings (frozen_price vs market_price at booking time)

    return {
      total_savings: { amount: 0, currency: 'RUB' },
      breakdown: {
        freeze_savings: { amount: 0, currency: 'RUB' },
        prediction_savings: { amount: 0, currency: 'RUB' },
        price_drop_refunds: { amount: 0, currency: 'RUB' },
      },
      bookings_count: 0,
    };
  }

  /**
   * Get user's price alerts (all statuses).
   */
  async getAlerts(userId: string) {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return {
      alerts: alerts.map((a) => ({
        id: a.id,
        origin: a.origin,
        destination: a.destination,
        departure_date: a.departure_date.toISOString().split('T')[0],
        target_price: Number(a.target_price),
        current_price: Number(a.current_price),
        status: a.status,
        created_at: a.created_at.toISOString(),
      })),
    };
  }

  /**
   * Create a new price alert for a route.
   * Validates max 10 alerts per user and departure_date in the future.
   */
  async createAlert(
    userId: string,
    data: {
      origin: string;
      destination: string;
      departure_date: string;
      target_price: number;
    },
  ) {
    // Validate departure_date is in the future
    const departure = new Date(data.departure_date);
    if (departure <= new Date()) {
      throw new BadRequestException('Departure date must be in the future');
    }

    // Validate max alerts per user
    const activeCount = await this.prisma.priceAlert.count({
      where: { user_id: userId, status: 'ACTIVE' },
    });
    if (activeCount >= MAX_ALERTS_PER_USER) {
      throw new ForbiddenException(
        `Maximum ${MAX_ALERTS_PER_USER} active alerts per user`,
      );
    }

    const alert = await this.prisma.priceAlert.create({
      data: {
        user_id: userId,
        origin: data.origin,
        destination: data.destination,
        departure_date: departure,
        target_price: data.target_price,
        current_price: 0, // will be populated on first price check
        status: 'ACTIVE',
      },
    });

    this.logger.log(
      `Created alert ${alert.id} for user ${userId}: ${data.origin}-${data.destination}`,
    );

    return {
      alert: {
        id: alert.id,
        origin: alert.origin,
        destination: alert.destination,
        departure_date: alert.departure_date.toISOString().split('T')[0],
        target_price: Number(alert.target_price),
        current_price: Number(alert.current_price),
        status: alert.status,
        created_at: alert.created_at.toISOString(),
      },
    };
  }

  /**
   * Delete (deactivate) a price alert.
   * Only the owning user can delete their own alerts.
   */
  async deleteAlert(userId: string, alertId: string) {
    const alert = await this.prisma.priceAlert.findFirst({
      where: { id: alertId, user_id: userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    await this.prisma.priceAlert.delete({
      where: { id: alertId },
    });

    this.logger.log(`Deleted alert ${alertId} for user ${userId}`);
    return { deleted: true };
  }

  /**
   * Background job: iterate ACTIVE alerts, check current prices,
   * trigger if price <= target, expire if departure date has passed.
   */
  async checkAlerts() {
    const now = new Date();

    // Expire alerts whose departure date has passed
    const expired = await this.prisma.priceAlert.updateMany({
      where: {
        status: 'ACTIVE',
        departure_date: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });
    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} alerts past departure date`);
    }

    // Fetch remaining active alerts
    const activeAlerts = await this.prisma.priceAlert.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const alert of activeAlerts) {
      // Look up the latest price from PriceHistory for this route + date
      const latestPrice = await this.prisma.priceHistory.findFirst({
        where: {
          origin: alert.origin,
          destination: alert.destination,
          departure_date: alert.departure_date,
        },
        orderBy: { observed_at: 'desc' },
      });

      if (!latestPrice) continue;

      const currentPrice = Number(latestPrice.price);

      // Update current_price on the alert
      await this.prisma.priceAlert.update({
        where: { id: alert.id },
        data: { current_price: currentPrice },
      });

      // Trigger if price <= target
      if (currentPrice <= Number(alert.target_price)) {
        await this.prisma.priceAlert.update({
          where: { id: alert.id },
          data: { status: 'TRIGGERED', current_price: currentPrice },
        });
        this.logger.log(
          `Alert ${alert.id} TRIGGERED: ${currentPrice} <= ${alert.target_price}`,
        );
      }
    }
  }
}
