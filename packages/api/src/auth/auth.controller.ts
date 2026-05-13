import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService, JwtPayload } from './auth.service';
import { RegisterDto, VerifyCodeDto, RefreshTokenDto } from './auth.dto';
import { JwtAuthGuard } from './auth.guard';
import { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Регистрация / отправка SMS-кода',
    description:
      'Создаёт нового пользователя или отправляет код подтверждения существующему. ' +
      'Код действителен 5 минут.',
  })
  @ApiOkResponse({ description: 'SMS-код отправлен' })
  @ApiBadRequestResponse({ description: 'Некорректный номер телефона' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.phone, dto.name);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Подтверждение SMS-кода',
    description:
      'Проверяет код из SMS и выдаёт пару JWT-токенов (access + refresh).',
  })
  @ApiOkResponse({ description: 'Токены выданы, пользователь аутентифицирован' })
  @ApiBadRequestResponse({ description: 'Неверный код или телефон' })
  @ApiUnauthorizedResponse({ description: 'Код не совпадает' })
  async verify(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.phone, dto.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление токенов',
    description: 'Принимает refresh token и выдаёт новую пару токенов.',
  })
  @ApiOkResponse({ description: 'Новая пара токенов выдана' })
  @ApiUnauthorizedResponse({ description: 'Невалидный refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Текущий пользователь',
    description: 'Возвращает данные аутентифицированного пользователя.',
  })
  @ApiOkResponse({ description: 'Данные пользователя' })
  @ApiUnauthorizedResponse({ description: 'Не аутентифицирован' })
  async me(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.validateUser(req.user.sub);
  }
}
