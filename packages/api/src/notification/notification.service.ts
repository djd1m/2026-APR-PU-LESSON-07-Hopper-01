import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../common/prisma.service';

export enum NotificationJobType {
  PRICE_ALERT_CHECK = 'price-alert-check',
  BOOKING_CONFIRMATION = 'booking-confirmation',
  FREEZE_EXPIRY_REMINDER = 'freeze-expiry-reminder',
  WEEKLY_DIGEST = 'weekly-digest',
  PRICE_DROP_DETECTED = 'price-drop-detected',
}

interface NotificationJobData {
  type: NotificationJobType;
  userId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const connection = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
    };

    this.queue = new Queue('notifications', { connection });

    this.worker = new Worker(
      'notifications',
      async (job: Job<NotificationJobData>) => {
        await this.processJob(job);
      },
      { connection, concurrency: 5 },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Notification job ${job.id} completed`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Notification job ${job?.id} failed: ${error.message}`,
      );
    });

    this.logger.log('Notification worker started');

    // Schedule recurring price alert check every 30 minutes
    this.queue
      .add(
        NotificationJobType.PRICE_ALERT_CHECK,
        {
          type: NotificationJobType.PRICE_ALERT_CHECK,
          userId: 'system',
          payload: {},
        },
        {
          repeat: { every: 30 * 60 * 1000 }, // 30 minutes
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      )
      .then(() =>
        this.logger.log('Price alert check scheduled every 30 minutes'),
      )
      .catch((err) =>
        this.logger.error(`Failed to schedule alert check: ${err.message}`),
      );
  }

  /**
   * Enqueue a price alert check for all active alerts.
   * Runs every 30 minutes via cron job.
   */
  async enqueuePriceAlertCheck() {
    // TODO: Fetch all active alerts from DB
    // TODO: For each alert, enqueue a check job
    await this.queue.add(
      NotificationJobType.PRICE_ALERT_CHECK,
      { type: NotificationJobType.PRICE_ALERT_CHECK, userId: 'system', payload: {} },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
  }

  /**
   * Send a booking confirmation notification via Telegram and/or email.
   */
  async sendBookingConfirmation(userId: string, bookingId: string) {
    await this.queue.add(
      NotificationJobType.BOOKING_CONFIRMATION,
      {
        type: NotificationJobType.BOOKING_CONFIRMATION,
        userId,
        payload: { bookingId },
      },
      { removeOnComplete: 100 },
    );
  }

  /**
   * Send a freeze expiry reminder 24h and 3 days before expiration.
   */
  async scheduleFreezeExpiryReminder(
    userId: string,
    freezeId: string,
    expiresAt: Date,
  ) {
    const threeDaysBefore = new Date(
      expiresAt.getTime() - 3 * 24 * 60 * 60 * 1000,
    );
    const oneDayBefore = new Date(
      expiresAt.getTime() - 1 * 24 * 60 * 60 * 1000,
    );

    await this.queue.add(
      NotificationJobType.FREEZE_EXPIRY_REMINDER,
      {
        type: NotificationJobType.FREEZE_EXPIRY_REMINDER,
        userId,
        payload: { freezeId, reminderType: '3_days' },
      },
      { delay: Math.max(0, threeDaysBefore.getTime() - Date.now()) },
    );

    await this.queue.add(
      NotificationJobType.FREEZE_EXPIRY_REMINDER,
      {
        type: NotificationJobType.FREEZE_EXPIRY_REMINDER,
        userId,
        payload: { freezeId, reminderType: '1_day' },
      },
      { delay: Math.max(0, oneDayBefore.getTime() - Date.now()) },
    );
  }

  /**
   * Notify user that a price drop was detected for a protected booking.
   */
  async sendPriceDropNotification(
    userId: string,
    bookingId: string,
    oldPrice: number,
    newPrice: number,
  ) {
    await this.queue.add(NotificationJobType.PRICE_DROP_DETECTED, {
      type: NotificationJobType.PRICE_DROP_DETECTED,
      userId,
      payload: { bookingId, oldPrice, newPrice, savings: oldPrice - newPrice },
    });
  }

  /**
   * Process all active price alerts: expire past-departure alerts,
   * check current prices, trigger alerts where price <= target,
   * and send Web Push notifications for triggered alerts.
   */
  async processAlertCheck() {
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

    // Fetch remaining active alerts with user info
    const activeAlerts = await this.prisma.priceAlert.findMany({
      where: { status: 'ACTIVE' },
      include: { user: true },
    });

    this.logger.log(
      `Processing ${activeAlerts.length} active price alerts`,
    );

    for (const alert of activeAlerts) {
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
          `Alert ${alert.id} TRIGGERED: ${currentPrice} <= ${alert.target_price} for ${alert.origin}-${alert.destination}`,
        );

        // Send Web Push notification for triggered alert
        await this.sendAlertTriggeredNotification(
          alert.user_id,
          alert.origin,
          alert.destination,
          Number(alert.target_price),
          currentPrice,
          alert.departure_date,
        );
      }
    }
  }

  /**
   * Send a Web Push notification when a price alert is triggered.
   */
  private async sendAlertTriggeredNotification(
    userId: string,
    origin: string,
    destination: string,
    targetPrice: number,
    currentPrice: number,
    departureDate: Date,
  ) {
    const savings = targetPrice - currentPrice;
    const dateStr = departureDate.toISOString().split('T')[0];

    // Enqueue a notification job for delivery
    await this.queue.add(
      'alert-triggered-push',
      {
        type: NotificationJobType.PRICE_DROP_DETECTED,
        userId,
        payload: {
          title: `Цена снизилась! ${origin} -> ${destination}`,
          body: `Текущая цена: ${currentPrice.toLocaleString('ru-RU')} ₽ (экономия ${savings.toLocaleString('ru-RU')} ₽). Дата вылета: ${dateStr}`,
          origin,
          destination,
          targetPrice,
          currentPrice,
          savings,
          departureDate: dateStr,
        },
      },
      { removeOnComplete: 100 },
    );

    this.logger.log(
      `Queued Web Push notification for user ${userId}: ${origin}-${destination} at ${currentPrice} RUB`,
    );
  }

  /**
   * Process a notification job.
   */
  private async processJob(job: Job<NotificationJobData>) {
    const { type, userId, payload } = job.data;

    switch (type) {
      case NotificationJobType.PRICE_ALERT_CHECK:
        await this.processAlertCheck();
        break;

      case NotificationJobType.BOOKING_CONFIRMATION:
        // TODO: Fetch booking details, format message, send via Telegram/email
        this.logger.log(
          `Sending booking confirmation to user ${userId} for booking ${payload.bookingId}`,
        );
        break;

      case NotificationJobType.FREEZE_EXPIRY_REMINDER:
        // TODO: Format reminder, send via Telegram
        this.logger.log(
          `Sending freeze expiry reminder to user ${userId}: ${payload.reminderType}`,
        );
        break;

      case NotificationJobType.PRICE_DROP_DETECTED:
        // TODO: Format price drop notification, send via Telegram
        this.logger.log(
          `Price drop detected for user ${userId}: saved ${payload.savings} RUB`,
        );
        break;

      case NotificationJobType.WEEKLY_DIGEST:
        // TODO: Aggregate weekly travel deals, send digest
        this.logger.log(`Sending weekly digest to user ${userId}`);
        break;

      default:
        this.logger.warn(`Unknown notification job type: ${type}`);
    }
  }
}
