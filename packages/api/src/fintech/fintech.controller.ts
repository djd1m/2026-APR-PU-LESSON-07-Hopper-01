import {
  Controller,
  Get,
  Post,
  Delete,
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

  // =========================================================================
  // PRICE FREEZE ENDPOINTS
  // =========================================================================

  @Post('freeze')
  @ApiOperation({
    summary: 'Freeze a flight price for 21 days',
    description:
      'Creates a price freeze for a flight. Fee: 2,000-3,000 RUB based on route volatility. ' +
      'Max 3 active freezes per user. Duration: 21 days.',
  })
  @ApiCreatedResponse({ description: 'Price freeze created' })
  async createFreeze(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateFreezeDto,
  ) {
    return this.fintechService.createFreeze(req.user.sub, dto);
  }

  @Get('freeze')
  @ApiOperation({
    summary: 'List all price freezes for the current user',
  })
  @ApiOkResponse({ description: 'List of freezes with active count' })
  async listFreezes(
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.fintechService.getUserFreezes(req.user.sub);
  }

  @Get('freeze/:id')
  @ApiOperation({
    summary: 'Get price freeze details',
    description: 'Returns freeze details including remaining days and current market price.',
  })
  @ApiParam({ name: 'id', description: 'Price freeze UUID' })
  @ApiOkResponse({ description: 'Freeze details with market price comparison' })
  async getFreeze(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.fintechService.getFreeze(req.user.sub, id);
  }

  @Post('freeze/:id/use')
  @ApiOperation({
    summary: 'Use a price freeze to book at the frozen price',
    description:
      'Uses an active freeze. User gets the LOWER of frozen vs current market price. ' +
      'Returns price comparison with savings amount.',
  })
  @ApiParam({ name: 'id', description: 'Price freeze UUID' })
  @ApiOkResponse({ description: 'Freeze used, booking price calculated' })
  async useFreeze(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.fintechService.useFreeze(req.user.sub, id);
  }

  @Post('freeze/:id/expire')
  @ApiOperation({
    summary: 'Manually expire a price freeze',
    description: 'Administrative endpoint to expire a freeze (fee not refunded).',
  })
  @ApiParam({ name: 'id', description: 'Price freeze UUID' })
  @ApiOkResponse({ description: 'Freeze expired' })
  async expireFreeze(@Param('id') id: string) {
    await this.fintechService.expireFreeze(id);
    return { success: true, message: 'Заморозка истекла' };
  }

  @Post('freeze/:id/refund')
  @ApiOperation({
    summary: 'Refund freeze fee (flight sold out)',
    description:
      'Refunds the freeze fee ONLY when the flight is sold out. ' +
      'This is the only scenario where the fee is refundable.',
  })
  @ApiParam({ name: 'id', description: 'Price freeze UUID' })
  @ApiOkResponse({ description: 'Freeze fee refunded' })
  async refundFreeze(@Param('id') id: string) {
    await this.fintechService.refundFreeze(id);
    return { success: true, message: 'Возврат средств за заморозку инициирован' };
  }

  // =========================================================================
  // PROTECTION ENDPOINTS
  // =========================================================================

  @Post('protect')
  @ApiOperation({ summary: 'Add protections to a booking' })
  @ApiCreatedResponse({ description: 'Protections activated' })
  async createProtection(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateProtectionDto,
  ) {
    return this.fintechService.createProtection(req.user.sub, dto);
  }
}
