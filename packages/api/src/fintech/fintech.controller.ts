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
import { FintechService } from './fintech.service';
import { CreateFreezeDto, CreateProtectionDto } from './fintech.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Request } from 'express';

@ApiTags('fintech')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class FintechController {
  constructor(private readonly fintechService: FintechService) {}

  @Post('freeze')
  @ApiOperation({ summary: 'Freeze a flight price for 21 days' })
  @ApiCreatedResponse({ description: 'Price freeze created' })
  async createFreeze(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateFreezeDto,
  ) {
    return this.fintechService.createFreeze(req.user.sub, dto);
  }

  @Get('freeze/:id')
  @ApiOperation({ summary: 'Get price freeze details' })
  @ApiParam({ name: 'id', description: 'Price freeze UUID' })
  @ApiOkResponse({ description: 'Freeze details' })
  async getFreeze(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.fintechService.getFreeze(req.user.sub, id);
  }

  @Post('freeze/:id/use')
  @ApiOperation({ summary: 'Use a price freeze to book at the frozen price' })
  @ApiParam({ name: 'id', description: 'Price freeze UUID' })
  @ApiOkResponse({ description: 'Freeze used, booking price calculated' })
  async useFreeze(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.fintechService.useFreeze(req.user.sub, id);
  }

  @Post('protect')
  @ApiOperation({ summary: 'Add protections to a booking' })
  @ApiCreatedResponse({ description: 'Protections activated' })
  async createProtection(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateProtectionDto,
  ) {
    return this.fintechService.createProtection(req.user.sub, dto);
  }

  // =========================================================================
  // PRICE DROP PROTECTION ENDPOINTS
  // =========================================================================

  @Post('protect/price-drop/:bookingId')
  @ApiOperation({
    summary: 'Add Price Drop Protection to a booking',
    description:
      'Monitors the flight price for 10 days after booking. ' +
      'Premium: 1,000-2,000 RUB. Auto-refunds the difference if price drops. ' +
      'Max refund: 50% of booking price. No claim process needed.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID' })
  @ApiCreatedResponse({ description: 'Price Drop Protection activated' })
  async addPriceDropProtection(
    @Req() req: Request & { user: { sub: string } },
    @Param('bookingId') bookingId: string,
  ) {
    return this.fintechService.addPriceDropProtection(bookingId, req.user.sub);
  }

  @Post('protect/price-drop/:protectionId/check')
  @ApiOperation({
    summary: 'Trigger a price drop check for a specific protection',
    description:
      'Compares current flight price vs booked price and auto-refunds if dropped. ' +
      'Normally called by the background job every 30 minutes.',
  })
  @ApiParam({ name: 'protectionId', description: 'Price Drop Protection UUID' })
  @ApiOkResponse({ description: 'Price check result' })
  async checkPriceDrop(@Param('protectionId') protectionId: string) {
    return this.fintechService.checkPriceDrop(protectionId);
  }

  @Get('protect/price-drop/:bookingId')
  @ApiOperation({
    summary: 'Get Price Drop Protection details for a booking',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID' })
  @ApiOkResponse({ description: 'Price Drop Protection details' })
  async getPriceDropProtection(
    @Req() req: Request & { user: { sub: string } },
    @Param('bookingId') bookingId: string,
  ) {
    return this.fintechService.getPriceDropProtection(bookingId, req.user.sub);
  }
}
