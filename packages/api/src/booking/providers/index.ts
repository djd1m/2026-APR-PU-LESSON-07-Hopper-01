export { BookingProvider, BookingRequest, BookingResult, CancelResult } from './booking-provider.interface';
export { MockBookingProvider } from './mock-booking.provider';
export { NemoBookingProvider } from './nemo-booking.provider';

/**
 * Factory token for dependency injection.
 * Usage in module:
 *   { provide: BOOKING_PROVIDER, useClass: MockBookingProvider }
 */
export const BOOKING_PROVIDER = 'BOOKING_PROVIDER';
