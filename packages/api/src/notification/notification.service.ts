import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { RedisService } from '../common/redis.service';

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
   * Process a notification job.
   */
  private async processJob(job: Job<NotificationJobData>) {
    const { type, userId, payload } = job.data;

    switch (type) {
      case NotificationJobType.PRICE_ALERT_CHECK:
        // TODO: Fetch active alerts, check current prices, notify if target hit
        this.logger.log('Processing price alert checks');
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
