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
@Controller('fintech')
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
}
