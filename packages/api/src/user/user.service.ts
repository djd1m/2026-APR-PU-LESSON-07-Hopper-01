import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

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
   * Get user's active price alerts.
   */
  async getAlerts(userId: string) {
    // TODO: Query price alerts from DB
    // return this.prisma.priceAlert.findMany({
    //   where: { userId, active: true },
    //   orderBy: { createdAt: 'desc' },
    // });

    return { alerts: [] };
  }

  /**
   * Create a new price alert for a route.
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
    // TODO: Create price alert in DB
    // TODO: Register with PriceMonitor background job
    // const alert = await this.prisma.priceAlert.create({ data: { userId, ...data } });

    this.logger.log(
      `Creating alert for user ${userId}: ${data.origin}-${data.destination}`,
    );

    return {
      alert: {
        id: 'placeholder-alert-id',
        ...data,
        active: true,
        created_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Delete (deactivate) a price alert.
   */
  async deleteAlert(userId: string, alertId: string) {
    // TODO: Soft-delete or deactivate alert
    // await this.prisma.priceAlert.update({
    //   where: { id: alertId, userId },
    //   data: { active: false },
    // });

    this.logger.log(`Deleting alert ${alertId} for user ${userId}`);
    return { deleted: true };
  }
}
