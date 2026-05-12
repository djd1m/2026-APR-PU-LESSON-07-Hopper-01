/** Notification delivery channel */
export enum Channel {
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

/** Types of notifications a user can receive */
export enum NotificationType {
  PRICE_ALERT = 'PRICE_ALERT',
  BOOKING_UPDATE = 'BOOKING_UPDATE',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  PROMO = 'PROMO',
}

/** Supported language codes */
export type LanguageCode = 'ru' | 'en';

/** Supported currency codes */
export type CurrencyCode = 'RUB' | 'USD' | 'EUR';

/** User notification and display preferences */
export interface UserPreferences {
  readonly notification_channels: Record<NotificationType, Channel[]>;
  readonly currency: CurrencyCode;
  readonly timezone: string;
  readonly language: LanguageCode;
}

/** Core user entity (maps to DB User table) */
export interface User {
  readonly id: string;
  readonly telegram_id: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly name: string;
  readonly home_airport: string;
  readonly preferences: UserPreferences;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}
