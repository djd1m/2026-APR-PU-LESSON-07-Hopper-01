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
  // CFAR ENDPOINTS
  // =========================================================================

  @Post('protect/cfar/:bookingId')
  @ApiOperation({
    summary: 'Add CFAR protection to a booking',
    description:
      'Cancel For Any Reason protection. Premium: 15-20% of booking price. ' +
      '100% refund if cancelled 24h+ before departure. ' +
      'Provided by licensed insurance partner.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID' })
  @ApiCreatedResponse({ description: 'CFAR protection activated' })
  async addCfarProtection(
    @Req() req: Request & { user: { sub: string } },
    @Param('bookingId') bookingId: string,
  ) {
    return this.fintechService.addCfarProtection(bookingId, req.user.sub);
  }

  @Post('protect/cfar/:protectionId/claim')
  @ApiOperation({
    summary: 'Claim CFAR protection — initiate 100% refund',
    description:
      'Must be 24h+ before departure. Initiates full refund of booking price. ' +
      'CFAR premium is NOT refunded. Refund within 5 business days.',
  })
  @ApiParam({ name: 'protectionId', description: 'CFAR protection UUID' })
  @ApiOkResponse({ description: 'Claim approved, refund initiated' })
  async claimCfar(
    @Req() req: Request & { user: { sub: string } },
    @Param('protectionId') protectionId: string,
  ) {
    return this.fintechService.claimCfar(protectionId, req.user.sub);
  }

  @Get('protect/cfar/:bookingId')
  @ApiOperation({
    summary: 'Get CFAR protection details for a booking',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID' })
  @ApiOkResponse({ description: 'CFAR protection details' })
  async getCfarProtection(
    @Req() req: Request & { user: { sub: string } },
    @Param('bookingId') bookingId: string,
  ) {
    return this.fintechService.getCfarProtection(bookingId, req.user.sub);
  }
}
