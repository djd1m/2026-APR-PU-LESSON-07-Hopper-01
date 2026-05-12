import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
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
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiCreatedResponse({ description: 'Booking confirmed' })
  async createBooking(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all bookings for the authenticated user' })
  @ApiOkResponse({ description: 'List of bookings' })
  async listBookings(@Req() req: Request & { user: { sub: string } }) {
    return this.bookingService.listBookings(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiOkResponse({ description: 'Booking details with protections' })
  async getBooking(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.bookingService.getBooking(req.user.sub, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiOkResponse({ description: 'Booking cancelled' })
  async cancelBooking(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(req.user.sub, id, dto.reason);
  }
}
