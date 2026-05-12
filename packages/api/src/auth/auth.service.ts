import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../common/prisma.service';

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface JwtPayload {
  sub: string;
  telegramId: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verify Telegram Login Widget data and issue JWT tokens.
   */
  async loginViaTelegram(authData: TelegramAuthData) {
    this.verifyTelegramAuth(authData);

    // TODO: Upsert user in database via Prisma
    // const user = await this.prisma.user.upsert({
    //   where: { telegramId: String(authData.id) },
    //   update: { name: `${authData.first_name} ${authData.last_name || ''}`.trim() },
    //   create: {
    //     telegramId: String(authData.id),
    //     name: `${authData.first_name} ${authData.last_name || ''}`.trim(),
    //     homeAirport: 'SVO',
    //   },
    // });

    const userId = String(authData.id); // TODO: replace with user.id from DB
    const payload: JwtPayload = {
      sub: userId,
      telegramId: String(authData.id),
      name: `${authData.first_name} ${authData.last_name || ''}`.trim(),
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: userId,
        name: payload.name,
        telegram_id: String(authData.id),
      },
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      const newPayload: JwtPayload = {
        sub: payload.sub,
        telegramId: payload.telegramId,
        name: payload.name,
      };
      return {
        access_token: this.jwtService.sign(newPayload),
        refresh_token: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Verify Telegram Login Widget hash per Telegram docs:
   * https://core.telegram.org/widgets/login#checking-authorization
   */
  private verifyTelegramAuth(authData: TelegramAuthData): void {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');

    // Check auth_date is not too old (allow 1 day)
    const authAge = Math.floor(Date.now() / 1000) - authData.auth_date;
    if (authAge > 86400) {
      throw new UnauthorizedException('Telegram auth data expired');
    }

    // Build check string
    const { hash, ...data } = authData;
    const checkString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key as keyof typeof data]}`)
      .join('\n');

    // Secret key = SHA256(bot_token)
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computedHash = createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram auth hash');
    }
  }
}
