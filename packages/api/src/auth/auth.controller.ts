import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { AuthService, TelegramAuthData } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  @ApiOperation({ summary: 'Authenticate via Telegram Login Widget' })
  @ApiCreatedResponse({ description: 'JWT tokens issued' })
  async loginViaTelegram(@Body() authData: TelegramAuthData) {
    return this.authService.loginViaTelegram(authData);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiCreatedResponse({ description: 'New token pair issued' })
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}
