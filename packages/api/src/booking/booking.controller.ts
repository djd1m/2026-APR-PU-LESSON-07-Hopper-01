import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto, CancelBookingDto } from './booking.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Request } from 'express';

@ApiTags('booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking with passengers and payment' })
  @ApiCreatedResponse({ description: 'Booking confirmed with PNR' })
  async createBooking(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all bookings for the authenticated user' })
  @ApiOkResponse({ description: 'List of bookings with flights and passengers' })
  async listBookings(@Req() req: Request & { user: { sub: string } }) {
    return this.bookingService.getBookings(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single booking by ID with full details' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiOkResponse({ description: 'Booking details with protections, passengers, flights' })
  async getBooking(
    @Req() req: Request & { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingService.getBookingById(req.user.sub, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking with CFAR or standard refund' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiOkResponse({ description: 'Booking cancelled with refund details' })
  async cancelBooking(
    @Req() req: Request & { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(req.user.sub, id, dto.reason);
  }
}
