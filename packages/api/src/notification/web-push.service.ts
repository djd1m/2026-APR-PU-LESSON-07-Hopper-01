import { Injectable, Logger } from '@nestjs/common';
import * as webPush from 'web-push';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PriceAlert {
  routeFrom: string;
  routeTo: string;
  currentPrice: number;
  targetPrice: number;
  recommendation: 'buy' | 'wait';
  confidence: number;
}

export interface BookingUpdate {
  bookingId: string;
  pnr: string;
  status: 'confirmed' | 'cancelled' | 'changed' | 'reminder';
  message: string;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  // In-memory store for MVP; replace with database persistence
  private subscriptions = new Map<string, PushSubscription[]>();

  constructor() {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@hopperru.ru';

    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      this.logger.log('Web Push VAPID credentials configured');
    } else {
      this.logger.warn(
        'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.',
      );
    }
  }

  /**
   * Subscribe a user to Web Push notifications.
   * A user may have multiple subscriptions (multiple browsers/devices).
   */
  async subscribe(
    userId: string,
    subscription: PushSubscription,
  ): Promise<void> {
    const existing = this.subscriptions.get(userId) || [];
    // Avoid duplicate subscriptions by endpoint
    if (!existing.some((s) => s.endpoint === subscription.endpoint)) {
      existing.push(subscription);
      this.subscriptions.set(userId, existing);
    }
    this.logger.log(
      `User ${userId} subscribed to Web Push (${existing.length} device(s))`,
    );
  }

  /**
   * Unsubscribe a user from a specific push endpoint.
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    const existing = this.subscriptions.get(userId) || [];
    const filtered = existing.filter((s) => s.endpoint !== endpoint);
    if (filtered.length === 0) {
      this.subscriptions.delete(userId);
    } else {
      this.subscriptions.set(userId, filtered);
    }
    this.logger.log(
      `User ${userId} unsubscribed from push endpoint (${filtered.length} remaining)`,
    );
  }

  /**
   * Get the count of active subscriptions for a user.
   */
  getSubscriptionCount(userId: string): number {
    return (this.subscriptions.get(userId) || []).length;
  }

  /**
   * Send a price alert push notification to a user.
   */
  async sendPriceAlert(userId: string, alert: PriceAlert): Promise<void> {
    const title =
      alert.recommendation === 'buy'
        ? `Покупай сейчас! ${alert.routeFrom} → ${alert.routeTo}`
        : `Подожди! ${alert.routeFrom} → ${alert.routeTo}`;

    const body =
      alert.recommendation === 'buy'
        ? `Цена ${alert.currentPrice.toLocaleString('ru-RU')} ₽ — ниже вашей цели ${alert.targetPrice.toLocaleString('ru-RU')} ₽. Уверенность: ${alert.confidence}%`
        : `Текущая цена ${alert.currentPrice.toLocaleString('ru-RU')} ₽. Ожидается снижение. Уверенность: ${alert.confidence}%`;

    await this.sendToUser(userId, {
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `price-alert-${alert.routeFrom}-${alert.routeTo}`,
      data: { type: 'price-alert', alert },
    });
  }

  /**
   * Send a booking update push notification to a user.
   */
  async sendBookingUpdate(
    userId: string,
    booking: BookingUpdate,
  ): Promise<void> {
    const statusLabels: Record<BookingUpdate['status'], string> = {
      confirmed: 'Бронирование подтверждено',
      cancelled: 'Бронирование отменено',
      changed: 'Изменение в бронировании',
      reminder: 'Напоминание о поездке',
    };

    await this.sendToUser(userId, {
      title: `${statusLabels[booking.status]} — ${booking.pnr}`,
      body: booking.message,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `booking-${booking.bookingId}`,
      data: { type: 'booking-update', booking },
    });
  }

  /**
   * Send a push notification payload to all of a user's subscribed devices.
   */
  private async sendToUser(
    userId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const subs = this.subscriptions.get(userId);
    if (!subs || subs.length === 0) {
      this.logger.debug(`No push subscriptions for user ${userId}`);
      return;
    }

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush.sendNotification(
          sub as unknown as webPush.PushSubscription,
          JSON.stringify(payload),
        ),
      ),
    );

    // Remove expired/invalid subscriptions (410 Gone)
    const validSubs = subs.filter((_, i) => {
      const result = results[i];
      if (result.status === 'rejected') {
        const statusCode = (result.reason as { statusCode?: number })
          ?.statusCode;
        if (statusCode === 410) {
          this.logger.log(
            `Removing expired subscription for user ${userId}: ${subs[i].endpoint}`,
          );
          return false;
        }
        this.logger.error(
          `Failed to send push to user ${userId}: ${result.reason}`,
        );
      }
      return true;
    });

    this.subscriptions.set(userId, validSubs);
  }
}
