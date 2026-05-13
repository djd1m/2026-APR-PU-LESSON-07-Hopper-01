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
   * Get user's booking history with flight details.
   */
  async getBookingHistory(userId: string) {
    // TODO: Query Prisma for bookings with related flight + protection data
    // return this.prisma.booking.findMany({
    //   where: { userId },
    //   include: { flights: true, protections: true },
    //   orderBy: { createdAt: 'desc' },
    // });

    this.logger.log(`Fetching booking history for user ${userId}`);

    // Mock booking history
    return {
      bookings: [
        {
          id: 'booking-001',
          origin: 'SVO',
          destination: 'AER',
          departure_at: '2026-06-15T08:30:00Z',
          return_at: '2026-06-22T18:00:00Z',
          airline: 'Аэрофлот',
          flight_number: 'SU-1120',
          status: 'CONFIRMED',
          total_price: 12500,
          protections: ['cancel_for_any_reason'],
          pnr: 'ABC123',
          created_at: '2026-05-01T12:00:00Z',
        },
        {
          id: 'booking-002',
          origin: 'LED',
          destination: 'KRR',
          departure_at: '2026-07-01T10:15:00Z',
          return_at: null,
          airline: 'S7 Airlines',
          flight_number: 'S7-1045',
          status: 'TICKETED',
          total_price: 8900,
          protections: ['price_drop'],
          pnr: 'XYZ789',
          created_at: '2026-04-20T09:30:00Z',
        },
        {
          id: 'booking-003',
          origin: 'SVO',
          destination: 'OVB',
          departure_at: '2026-03-10T14:00:00Z',
          return_at: '2026-03-17T06:00:00Z',
          airline: 'Уральские авиалинии',
          flight_number: 'U6-3301',
          status: 'COMPLETED',
          total_price: 15200,
          protections: [],
          pnr: 'QWE456',
          created_at: '2026-02-15T14:20:00Z',
        },
      ],
      total: 3,
    };
  }

  /**
   * Get referral program statistics for a user.
   */
  async getReferralStats(userId: string) {
    // TODO: Query referral tables
    // const referrals = await this.prisma.referral.findMany({
    //   where: { referrerId: userId },
    // });

    this.logger.log(`Fetching referral stats for user ${userId}`);

    return {
      referral_code: this.generateReferralCode(userId),
      referral_link: `https://hopperru.ru/ref/${this.generateReferralCode(userId)}`,
      total_referrals: 3,
      successful_referrals: 2,
      bonus_earned: { amount: 1500, currency: 'RUB' },
      bonus_available: { amount: 500, currency: 'RUB' },
      referrals: [
        { name: 'Алексей К.', status: 'active', bonus: 500, joined_at: '2026-04-15' },
        { name: 'Мария П.', status: 'active', bonus: 500, joined_at: '2026-04-20' },
        { name: 'Дмитрий Р.', status: 'pending', bonus: 0, joined_at: '2026-05-01' },
      ],
    };
  }

  /**
   * Generate a deterministic referral code for a user.
   */
  generateReferralCode(userId: string): string {
    // Generate a short alphanumeric code from userId
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    let code = 'HR';
    for (let i = 0; i < 6; i++) {
      hash = Math.abs(hash * 31 + i);
      code += chars[hash % chars.length];
    }
    return code;
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
