import {
  Controller,
  Post,
  Body,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { WebPushService } from './web-push.service';
import { SubscribePushDto, UnsubscribePushDto } from './notification.dto';
import { Request } from 'express';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly webPushService: WebPushService) {}

  /**
   * POST /api/notifications/subscribe
   * Save a push subscription for the authenticated user.
   * A user can have multiple subscriptions (one per browser/device).
   */
  @Post('subscribe')
  @ApiOperation({
    summary: 'Subscribe to web push notifications',
    description:
      'Registers a browser push subscription for the current user. ' +
      'Duplicate endpoints are silently ignored.',
  })
  @ApiCreatedResponse({ description: 'Push subscription saved' })
  async subscribe(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: SubscribePushDto,
  ) {
    const userId = req.user.sub;

    await this.webPushService.subscribe(userId, {
      endpoint: dto.endpoint,
      keys: {
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });

    return {
      success: true,
      message: 'Push-уведомления подключены',
    };
  }

  /**
   * POST /api/notifications/unsubscribe
   * Remove a push subscription for the authenticated user.
   */
  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unsubscribe from web push notifications',
    description:
      'Removes a specific push subscription endpoint for the current user.',
  })
  @ApiOkResponse({ description: 'Push subscription removed' })
  async unsubscribe(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: UnsubscribePushDto,
  ) {
    const userId = req.user.sub;

    await this.webPushService.unsubscribe(userId, dto.endpoint);

    return {
      success: true,
      message: 'Push-уведомления отключены',
    };
  }

  /**
   * GET /api/notifications/vapid-key
   * Return the VAPID public key so the frontend can subscribe to push.
   */
  @Get('vapid-key')
  @ApiOperation({
    summary: 'Get VAPID public key for push subscription',
  })
  @ApiOkResponse({ description: 'VAPID public key' })
  getVapidKey() {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY || '',
    };
  }
}
