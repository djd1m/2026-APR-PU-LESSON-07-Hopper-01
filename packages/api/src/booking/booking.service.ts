import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateBookingDto } from './booking.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new booking with optional price freeze and protections.
   * Follows the BookingOrchestrator flow from Pseudocode.md.
   */
  async createBooking(userId: string, dto: CreateBookingDto) {
    // TODO: Step 1 - Validate request (passengers, payment method)
    // TODO: Step 2 - Check active price freeze if freeze_id provided
    // TODO: Step 3 - Get final price (frozen or current market)
    // TODO: Step 4 - Calculate protection costs via ProtectionBundleCalculator
    // TODO: Step 5 - Calculate total = flight + protections
    // TODO: Step 6 - Create payment via YooKassa
    // TODO: Step 7 - Book with supplier API
    // TODO: Step 8 - Create booking record in DB
    // TODO: Step 9 - Activate protections (CFAR via insurance partner, Price Drop monitor)
    // TODO: Step 10 - Send confirmations (Telegram, email)

    this.logger.log(
      `Creating booking for user ${userId}, flight ${dto.flight_id}`,
    );

    // Stub response matching API contract from Pseudocode.md
    return {
      booking: {
        id: 'placeholder-booking-id',
        status: 'confirmed',
        pnr: 'ABC123',
        total_price: { amount: 11700, currency: 'RUB' },
        breakdown: {
          flight: { amount: 8500, currency: 'RUB' },
          protections: { amount: 3200, currency: 'RUB' },
        },
        protections:
          dto.protections?.map((p) => ({
            type: p.type,
            status: 'active',
            coverage: { amount: 8500, currency: 'RUB' },
          })) || [],
        confirmed_at: new Date().toISOString(),
      },
    };
  }

  /**
   * List all bookings for a user.
   */
  async listBookings(userId: string) {
    // TODO: Query Prisma for user's bookings with relations
    // return this.prisma.booking.findMany({
    //   where: { userId, deletedAt: null },
    //   include: { protections: true, items: true },
    //   orderBy: { createdAt: 'desc' },
    // });

    return { bookings: [] };
  }

  /**
   * Get a single booking by ID.
   */
  async getBooking(userId: string, bookingId: string) {
    // TODO: Query Prisma with authorization check
    // const booking = await this.prisma.booking.findFirst({
    //   where: { id: bookingId, userId },
    //   include: { protections: true, items: true, passengers: true },
    // });
    // if (!booking) throw new NotFoundException('Booking not found');

    throw new NotFoundException(
      `Booking ${bookingId} not found for user ${userId}`,
    );
  }

  /**
   * Cancel a booking. Triggers refund flow and protection voiding.
   */
  async cancelBooking(userId: string, bookingId: string, reason?: string) {
    // TODO: Validate booking exists and belongs to user
    // TODO: Check if cancellation is allowed (status must be CONFIRMED or TICKETED)
    // TODO: Initiate refund via YooKassa
    // TODO: Void active protections
    // TODO: Update booking status to CANCELLED
    // TODO: Send cancellation notification

    this.logger.log(
      `Cancelling booking ${bookingId} for user ${userId}, reason: ${reason}`,
    );

    return {
      booking: {
        id: bookingId,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      },
    };
  }
}
