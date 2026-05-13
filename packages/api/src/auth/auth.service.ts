import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../common/prisma.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  name: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Register a new user or re-send verification code to existing user.
   * Creates user record in DB and sends SMS code (mock for now).
   */
  async register(phone: string, name: string): Promise<{ message: string }> {
    const normalizedPhone = this.normalizePhone(phone);
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert: create new user or update code for existing
    await this.prisma.user.upsert({
      where: { phone: normalizedPhone },
      update: {
        name,
        verification_code: code,
        verification_expires: expiresAt,
      },
      create: {
        phone: normalizedPhone,
        name,
        home_airport: 'SVO',
        verification_code: code,
        verification_expires: expiresAt,
      },
    });

    // Mock SMS sending — in production, integrate with SMS provider (e.g., SMS.ru, SMSC)
    this.logger.log(
      `[MOCK SMS] Code ${code} sent to ${normalizedPhone}`,
    );

    return { message: 'Код подтверждения отправлен' };
  }

  /**
   * Verify the SMS code and issue JWT token pair.
   */
  async verifyCode(
    phone: string,
    code: string,
  ): Promise<TokenPair & { user: { id: string; name: string; phone: string } }> {
    const normalizedPhone = this.normalizePhone(phone);

    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден. Сначала зарегистрируйтесь.');
    }

    if (!user.verification_code || !user.verification_expires) {
      throw new BadRequestException('Код не запрошен. Запросите новый код.');
    }

    if (new Date() > user.verification_expires) {
      throw new BadRequestException('Код истёк. Запросите новый код.');
    }

    if (user.verification_code !== code) {
      throw new UnauthorizedException('Неверный код подтверждения');
    }

    // Clear verification code after successful use
    const tokens = await this.issueTokens(user.id, normalizedPhone, user.name);

    // Store hashed refresh token and clear verification code
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verification_code: null,
        verification_expires: null,
        refresh_token_hash: this.hashToken(tokens.refreshToken),
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        phone: normalizedPhone,
      },
    };
  }

  /**
   * Validate refresh token and issue a new token pair.
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Невалидный или истёкший refresh token');
    }

    // Verify the refresh token hash matches what's stored in DB
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refresh_token_hash) {
      throw new UnauthorizedException('Пользователь не найден или сессия завершена');
    }

    const tokenHash = this.hashToken(refreshToken);
    if (user.refresh_token_hash !== tokenHash) {
      // Possible token reuse — invalidate all sessions
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refresh_token_hash: null },
      });
      throw new UnauthorizedException('Refresh token был использован повторно. Войдите заново.');
    }

    // Issue new pair and rotate refresh token
    const tokens = await this.issueTokens(user.id, user.phone!, user.name);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token_hash: this.hashToken(tokens.refreshToken) },
    });

    return tokens;
  }

  /**
   * Fetch user from DB by ID. Used by the JWT guard to populate request.user.
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        home_airport: true,
        preferences: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return user;
  }

  // ─── Private helpers ───────────────────────────────────────

  private async issueTokens(
    userId: string,
    phone: string,
    name: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: userId,
      phone,
      name,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.getAccessSecret(),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private generateCode(): string {
    // 6-digit numeric code
    return String(randomInt(100000, 999999));
  }

  private normalizePhone(phone: string): string {
    // Strip everything except digits, ensure +7 prefix for Russian numbers
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) {
      return `+7${digits.slice(1)}`;
    }
    if (digits.startsWith('7') && digits.length === 11) {
      return `+${digits}`;
    }
    if (digits.startsWith('9') && digits.length === 10) {
      return `+7${digits}`;
    }
    return `+${digits}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getAccessSecret(): string {
    return this.configService.get<string>('JWT_SECRET', 'dev-secret-change-me');
  }

  private getRefreshSecret(): string {
    return this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret-change-me',
    );
  }
}
