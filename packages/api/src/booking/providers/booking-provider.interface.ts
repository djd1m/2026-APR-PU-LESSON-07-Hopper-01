/**
 * BookingProvider — abstraction layer for GDS/airline booking.
 *
 * Implementations:
 * - MockBookingProvider (current) — simulated booking, no real GDS
 * - NemoBookingProvider (future) — real booking via Nemo.travel API
 *
 * Switch via BOOKING_PROVIDER env var: "mock" (default) | "nemo"
 */
export interface BookingResult {
  success: boolean;
  pnr: string;                    // Real PNR from GDS (e.g., "6AEJZ0")
  payment_id: string;
  status: 'confirmed' | 'pending' | 'failed';
  ticket_number?: string;          // E-ticket number (e.g., "555-1234567890")
  raw_response?: unknown;          // Original GDS response for debugging
  error?: string;
}

export interface CancelResult {
  success: boolean;
  refund_amount: number;
  refund_currency: string;
  processing_days: number;
  error?: string;
}

export interface BookingRequest {
  flight_id: string;
  origin: string;
  destination: string;
  departure_at: string;
  airline: string;
  flight_number: string;
  price: number;
  currency: string;
  passengers: {
    first_name: string;
    last_name: string;
    passport_number: string;
    date_of_birth: string;
    nationality: string;
  }[];
  payment_method: string;
  contact_phone: string;
  contact_email?: string;
}

export interface BookingProvider {
  readonly name: string;

  /** Create a booking in GDS and return PNR */
  createBooking(request: BookingRequest): Promise<BookingResult>;

  /** Cancel a booking by PNR */
  cancelBooking(pnr: string): Promise<CancelResult>;

  /** Check booking status */
  getBookingStatus(pnr: string): Promise<{ status: string; raw?: unknown }>;

  /** Health check — is provider reachable? */
  isAvailable(): Promise<boolean>;
}
