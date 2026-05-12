import {
  Controller,
  Get,
  Patch,
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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Request } from 'express';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'User profile with preferences' })
  async getProfile(@Req() req: Request & { user: { sub: string } }) {
    return this.userService.getProfile(req.user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ description: 'Updated user profile' })
  async updateProfile(
    @Req() req: Request & { user: { sub: string } },
    @Body() updates: Record<string, unknown>,
  ) {
    return this.userService.updateProfile(req.user.sub, updates);
  }

  @Get('savings')
  @ApiOperation({ summary: 'Get cumulative savings from predictions and freezes' })
  @ApiOkResponse({ description: 'Savings breakdown' })
  async getSavings(@Req() req: Request & { user: { sub: string } }) {
    return this.userService.getSavings(req.user.sub);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active price alerts' })
  @ApiOkResponse({ description: 'List of price alerts' })
  async getAlerts(@Req() req: Request & { user: { sub: string } }) {
    return this.userService.getAlerts(req.user.sub);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create a new price alert for a route' })
  @ApiCreatedResponse({ description: 'Price alert created' })
  async createAlert(
    @Req() req: Request & { user: { sub: string } },
    @Body()
    data: {
      origin: string;
      destination: string;
      departure_date: string;
      target_price: number;
    },
  ) {
    return this.userService.createAlert(req.user.sub, data);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete a price alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  @ApiOkResponse({ description: 'Alert deleted' })
  async deleteAlert(
    @Req() req: Request & { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.userService.deleteAlert(req.user.sub, id);
  }
}
