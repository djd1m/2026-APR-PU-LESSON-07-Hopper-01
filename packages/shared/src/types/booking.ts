/** Type of booking */
export enum BookingType {
  FLIGHT = 'FLIGHT',
  HOTEL = 'HOTEL',
  TRAIN = 'TRAIN',
}

/** Booking lifecycle status */
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  TICKETED = 'TICKETED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/** Payment method */
export enum PaymentMethod {
  MIR = 'MIR',
  SBP = 'SBP',
  TELEGRAM = 'TELEGRAM',
}

/** Passenger on a booking */
export interface Passenger {
  readonly id: string;
  readonly booking_id: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly passport_number: string;
  readonly date_of_birth: Date;
  readonly nationality: string;
}

/** Individual item within a booking (flight leg, hotel night, etc.) */
export interface BookingItem {
  readonly id: string;
  readonly booking_id: string;
  readonly flight_id: string | null;
  readonly hotel_id: string | null;
  readonly price: number;
  readonly currency: string;
}

/** Core booking entity */
export interface Booking {
  readonly id: string;
  readonly user_id: string;
  readonly type: BookingType;
  readonly status: BookingStatus;
  readonly items: readonly BookingItem[];
  readonly passengers: readonly Passenger[];
  readonly total_price: number;
  readonly currency: string;
  readonly payment_id: string;
  readonly payment_method: PaymentMethod;
  readonly pnr: string | null;
  readonly created_at: Date;
  readonly confirmed_at: Date | null;
  readonly cancelled_at: Date | null;
  readonly cancellation_reason: string | null;
}
