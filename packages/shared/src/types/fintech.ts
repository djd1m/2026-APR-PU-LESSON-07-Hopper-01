/** Price freeze lifecycle status */
export enum FreezeStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/** Protection product type */
export enum ProtectionType {
  CANCEL_FOR_ANY_REASON = 'CANCEL_FOR_ANY_REASON',
  PRICE_DROP = 'PRICE_DROP',
  FLIGHT_DISRUPTION = 'FLIGHT_DISRUPTION',
}

/** Protection lifecycle status */
export enum ProtectionStatus {
  ACTIVE = 'ACTIVE',
  CLAIMED = 'CLAIMED',
  PAID_OUT = 'PAID_OUT',
  EXPIRED = 'EXPIRED',
  VOIDED = 'VOIDED',
}

/** Price direction prediction */
export enum PriceDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE',
}

/** Recommended action for user */
export enum RecommendedAction {
  BUY_NOW = 'BUY_NOW',
  WAIT = 'WAIT',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
}

/** Price alert status */
export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  TRIGGERED = 'TRIGGERED',
  EXPIRED = 'EXPIRED',
}

/** Price freeze — lock a flight price for up to 21 days */
export interface PriceFreeze {
  readonly id: string;
  readonly user_id: string;
  readonly flight_id: string;
  readonly frozen_price: number;
  readonly fee_paid: number;
  readonly status: FreezeStatus;
  readonly expires_at: Date;
  readonly created_at: Date;
  readonly used_at: Date | null;
  readonly booking_id: string | null;
}

/** Protection product attached to a booking */
export interface Protection {
  readonly id: string;
  readonly booking_id: string;
  readonly type: ProtectionType;
  readonly status: ProtectionStatus;
  readonly premium_paid: number;
  readonly coverage_amount: number;
  readonly claim_amount: number | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

/** ML/rule-based price prediction for a route+date */
export interface PricePrediction {
  readonly id: string;
  readonly origin: string;
  readonly destination: string;
  readonly departure_date: string;
  readonly predicted_price: number;
  readonly confidence: number;
  readonly recommendation: RecommendedAction;
  readonly predicted_change_pct: number;
  readonly valid_until: Date;
  readonly model_version: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

/** User-configured price alert */
export interface PriceAlert {
  readonly id: string;
  readonly user_id: string;
  readonly origin: string;
  readonly destination: string;
  readonly departure_date: string;
  readonly target_price: number;
  readonly current_price: number;
  readonly status: AlertStatus;
  readonly created_at: Date;
  readonly updated_at: Date;
}

/** Historical price observation (for analytics / ClickHouse sync) */
export interface PriceHistory {
  readonly id: string;
  readonly origin: string;
  readonly destination: string;
  readonly departure_date: string;
  readonly price: number;
  readonly airline: string;
  readonly observed_at: Date;
}
