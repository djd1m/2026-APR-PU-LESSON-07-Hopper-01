---
name: coding-standards
description: >
  Tech-specific coding patterns and templates for HopperRU. Provides ready-to-use
  templates for NestJS modules, Prisma schemas, API endpoints, Telegram bot commands,
  error handling, DTO validation, and environment configuration. Use when implementing
  new features or reviewing code for pattern consistency.
version: "1.0"
maturity: production
---

# Coding Standards: HopperRU

## What This Skill Provides

Ready-to-use code templates and patterns for the HopperRU tech stack. Load this skill when implementing new features to ensure consistency across the codebase.

## NestJS Module Template

When creating a new domain module, follow this structure:

### Module Definition

```typescript
// packages/api/src/modules/<domain>/<domain>.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { <Domain>Controller } from './<domain>.controller';
import { <Domain>Service } from './<domain>.service';
import { <Domain>Repository } from './<domain>.repository';

@Module({
  imports: [PrismaModule],
  controllers: [<Domain>Controller],
  providers: [<Domain>Service, <Domain>Repository],
  exports: [<Domain>Service],
})
export class <Domain>Module {}
```

### Service

```typescript
// packages/api/src/modules/<domain>/<domain>.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { <Domain>Repository } from './<domain>.repository';

@Injectable()
export class <Domain>Service {
  private readonly logger = new Logger(<Domain>Service.name);

  constructor(
    private readonly repository: <Domain>Repository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new <entity>.
   * @param userId - The authenticated user's ID
   * @param dto - Validated creation data
   * @returns The created entity
   * @throws {<Domain>ConflictException} If a duplicate exists
   */
  async create(userId: string, dto: Create<Domain>Dto): Promise<<Domain>> {
    this.logger.log(`Creating <domain> for user ${userId}`);

    // 1. Validate business rules
    // 2. Persist via repository
    const entity = await this.repository.create({ ...dto, userId });

    // 3. Emit domain event
    this.eventEmitter.emit('<domain>.created', { entityId: entity.id, userId });

    return entity;
  }
}
```

### Repository

```typescript
// packages/api/src/modules/<domain>/<domain>.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class <Domain>Repository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<<Domain> | null> {
    return this.prisma.<entity>.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        // Explicit field selection -- never select *
      },
    });
  }

  async findByUserId(userId: string): Promise<<Domain>[]> {
    return this.prisma.<entity>.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async create(data: Create<Domain>Data): Promise<<Domain>> {
    return this.prisma.<entity>.create({
      data,
      select: {
        id: true,
        // Return only needed fields
      },
    });
  }
}
```

### Controller

```typescript
// packages/api/src/modules/<domain>/<domain>.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, UsePipes, ValidationPipe, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { <Domain>Service } from './<domain>.service';
import { Create<Domain>Dto } from './dto/create-<domain>.dto';
import { <Domain>ResponseDto } from './dto/<domain>.response.dto';
import { ApiResponse as AppResponse } from '../../common/interfaces/api-response.interface';

@ApiTags('<domain>')
@ApiBearerAuth()
@Controller('api/v1/<domain>')
@UseGuards(JwtAuthGuard)
export class <Domain>Controller {
  constructor(private readonly service: <Domain>Service) {}

  @Post()
  @ApiOperation({ summary: 'Create a new <domain>' })
  @ApiResponse({ status: 201, type: <Domain>ResponseDto })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Create<Domain>Dto,
  ): Promise<AppResponse<<Domain>ResponseDto>> {
    const entity = await this.service.create(user.id, dto);
    return { data: <Domain>ResponseDto.from(entity) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get <domain> by ID' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppResponse<<Domain>ResponseDto>> {
    const entity = await this.service.findOneForUser(user.id, id);
    return { data: <Domain>ResponseDto.from(entity) };
  }
}
```

## Prisma Schema Conventions

```prisma
// packages/db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// === ENUMS ===

enum BookingStatus {
  PENDING
  CONFIRMED
  TICKETED
  CHECKED_IN
  COMPLETED
  CANCELLED
  REFUNDED
}

enum ProtectionType {
  PRICE_FREEZE
  CANCEL_FOR_ANY_REASON
  PRICE_DROP
  FLIGHT_DISRUPTION
}

// === MODELS ===

model User {
  id          String    @id @default(uuid())
  telegramId  String?   @unique @map("telegram_id")
  email       String?   @unique
  phone       String?                           // Encrypted at app level
  name        String
  homeAirport String    @default("SVO") @map("home_airport")
  preferences Json      @default("{}") @db.JsonB
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  bookings     Booking[]
  priceFreezes PriceFreeze[]
  priceAlerts  PriceAlert[]

  @@map("users")
}

model Booking {
  id                  String        @id @default(uuid())
  userId              String        @map("user_id")
  type                String        @default("FLIGHT")
  status              BookingStatus @default(PENDING)
  totalPrice          Decimal       @map("total_price") @db.Decimal(12, 2)
  paymentId           String?       @map("payment_id")
  paymentMethod       String?       @map("payment_method")
  pnr                 String?
  cancellationReason  String?       @map("cancellation_reason")
  createdAt           DateTime      @default(now()) @map("created_at")
  updatedAt           DateTime      @updatedAt @map("updated_at")
  confirmedAt         DateTime?     @map("confirmed_at")
  cancelledAt         DateTime?     @map("cancelled_at")

  user        User          @relation(fields: [userId], references: [id])
  passengers  Passenger[]
  protections Protection[]

  @@index([userId, status])
  @@index([status, createdAt])
  @@map("bookings")
}
```

**Key patterns:**
- `@map("snake_case")` for all multi-word fields
- `@@map("plural_snake_case")` for table names
- `@db.Decimal(12, 2)` for monetary values
- `Json @db.JsonB` for flexible structured data
- Always include `@@index` for commonly queried field combinations

## API Endpoint Template

### Request DTO

```typescript
// packages/api/src/modules/<domain>/dto/create-<domain>.dto.ts
import {
  IsString, IsDateString, IsEnum, IsOptional,
  IsInt, Min, Max, IsUUID, Length,
  ValidateNested, IsArray, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'Flight ID to book', example: 'uuid' })
  @IsUUID()
  flightId: string;

  @ApiProperty({ type: [PassengerDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiPropertyOptional({ description: 'Price freeze ID to apply' })
  @IsOptional()
  @IsUUID()
  freezeId?: string;

  @ApiProperty({ enum: ['MIR', 'SBP'], description: 'Payment method' })
  @IsEnum(['MIR', 'SBP'] as const)
  paymentMethod: 'MIR' | 'SBP';
}

export class PassengerDto {
  @ApiProperty({ example: 'Ivan' })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ example: 'Petrov' })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: 'RU' })
  @IsString()
  @Length(2, 2)
  citizenship: string;
}
```

### Response DTO

```typescript
// packages/api/src/modules/<domain>/dto/<domain>.response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BookingResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty({ enum: BookingStatus })
  @Expose()
  status: string;

  @ApiProperty()
  @Expose()
  totalPrice: number;

  @ApiProperty()
  @Expose()
  pnr: string | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  confirmedAt: Date | null;

  // Internal fields excluded from response
  @Exclude()
  userId: string;

  @Exclude()
  paymentId: string;

  static from(entity: Booking): BookingResponseDto {
    return plainToInstance(BookingResponseDto, entity, {
      excludeExtraneousValues: true,
    });
  }
}
```

## Telegram Bot Command Template (telegraf.js)

```typescript
// packages/bot/src/commands/search.command.ts
import { Telegraf, Context, Markup } from 'telegraf';
import { Injectable, Logger } from '@nestjs/common';
import { ApiClient } from '../api/api.client';

@Injectable()
export class SearchCommand {
  private readonly logger = new Logger(SearchCommand.name);

  constructor(private readonly apiClient: ApiClient) {}

  register(bot: Telegraf<Context>) {
    // Command handler: /search
    bot.command('search', async (ctx) => {
      try {
        await ctx.reply(
          'Откуда летим? Введите город или код аэропорта:',
          Markup.forceReply().selective(),
        );
        // Store conversation state
        await this.setUserState(ctx.from.id, 'AWAITING_ORIGIN');
      } catch (error) {
        this.logger.error(`Search command failed for user ${ctx.from.id}`, error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
      }
    });

    // Inline query handler for flight search
    bot.on('inline_query', async (ctx) => {
      const query = ctx.inlineQuery.query;
      if (query.length < 3) return;

      try {
        const results = await this.apiClient.searchFlights(query);
        const articles = results.map((flight) => ({
          type: 'article' as const,
          id: flight.id,
          title: `${flight.origin} -> ${flight.destination}`,
          description: `${flight.price.amount} RUB | ${flight.airline} | ${flight.departureAt}`,
          input_message_content: {
            message_text: this.formatFlightMessage(flight),
            parse_mode: 'HTML' as const,
          },
          reply_markup: Markup.inlineKeyboard([
            Markup.button.callback('Забронировать', `book:${flight.id}`),
            Markup.button.callback('Заморозить цену', `freeze:${flight.id}`),
          ]),
        }));

        await ctx.answerInlineQuery(articles, { cache_time: 300 });
      } catch (error) {
        this.logger.error('Inline query failed', error);
      }
    });

    // Callback query handler for booking action
    bot.action(/^book:(.+)$/, async (ctx) => {
      const flightId = ctx.match[1];
      try {
        await ctx.answerCbQuery('Начинаем бронирование...');
        // Redirect to booking flow
        const paymentUrl = await this.apiClient.initiateBooking(
          ctx.from.id.toString(),
          flightId,
        );
        await ctx.reply(
          'Перейдите по ссылке для оплаты:',
          Markup.inlineKeyboard([
            Markup.button.url('Оплатить', paymentUrl),
          ]),
        );
      } catch (error) {
        this.logger.error(`Booking initiation failed for flight ${flightId}`, error);
        await ctx.reply('Не удалось начать бронирование. Попробуйте позже.');
      }
    });
  }

  private formatFlightMessage(flight: FlightResult): string {
    return [
      `<b>${flight.airline} ${flight.flightNumber}</b>`,
      `${flight.origin} -> ${flight.destination}`,
      `Вылет: ${formatDate(flight.departureAt)}`,
      `Цена: <b>${flight.price.amount} RUB</b>`,
      flight.prediction
        ? `AI: ${flight.prediction.action === 'BUY_NOW' ? 'Купить сейчас' : 'Подождать'}`
        : '',
    ].filter(Boolean).join('\n');
  }

  private async setUserState(telegramId: number, state: string): Promise<void> {
    // Store in Redis: `bot:state:{telegramId}` -> state, TTL 5 min
  }
}
```

## Error Handling Pattern

```typescript
// packages/api/src/common/exceptions/domain.exception.ts

/**
 * Base exception for all domain errors.
 * Carries a machine-readable code and optional structured details.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// packages/api/src/modules/fintech/exceptions/freeze.exceptions.ts

export class FreezeLimitExceededException extends DomainException {
  readonly code = 'FREEZE_LIMIT_EXCEEDED';
  readonly httpStatus = 409;

  constructor(current: number) {
    super(`Максимум 3 активных заморозки. У вас уже ${current}.`, { current, max: 3 });
  }
}

export class FreezeExpiredException extends DomainException {
  readonly code = 'FREEZE_EXPIRED';
  readonly httpStatus = 410;

  constructor(freezeId: string) {
    super('Срок заморозки истёк.', { freezeId });
  }
}

export class FreezeAlreadyUsedException extends DomainException {
  readonly code = 'FREEZE_ALREADY_USED';
  readonly httpStatus = 409;

  constructor(freezeId: string) {
    super('Эта заморозка уже использована.', { freezeId });
  }
}

// packages/api/src/common/filters/domain-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    this.logger.warn(
      `${exception.code}: ${exception.message}`,
      { path: request.url, userId: request.user?.id, details: exception.details },
    );

    response.status(exception.httpStatus).json({
      error: {
        code: exception.code,
        message: exception.message,
        details: exception.details,
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

## DTO Validation with class-validator

### Common Validators

```typescript
// packages/shared/src/validators/money.validator.ts
import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsPositiveMoney(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveMoney',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} должна быть положительной суммой`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'number' && value > 0 && Number.isFinite(value);
        },
      },
    });
  };
}

// packages/shared/src/validators/iata.validator.ts
export function IsIataCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIataCode',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} должен быть валидным IATA кодом (3 буквы)`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
        },
      },
    });
  };
}
```

## Environment Configuration Pattern

```typescript
// packages/api/src/config/configuration.ts
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_READ_REPLICA: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().url(),

  // ClickHouse
  CLICKHOUSE_URL: z.string().url().optional(),

  // JWT
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // YooKassa
  YOOKASSA_SHOP_ID: z.string().min(1),
  YOOKASSA_SECRET_KEY: z.string().min(1),
  YOOKASSA_WEBHOOK_SECRET: z.string().min(1),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1),

  // Insurance Partner
  INSURANCE_API_URL: z.string().url().optional(),
  INSURANCE_API_KEY: z.string().optional(),

  // Encryption
  ENCRYPTION_MASTER_KEY: z.string().min(32),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error('Invalid environment variables:', formatted);
    throw new Error('Environment validation failed. See above for details.');
  }
  return result.data;
}

// Usage in NestJS module:
// packages/api/src/config/config.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateEnv } from './configuration';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
    }),
  ],
})
export class ConfigModule {}
```

### .env.example Template

```bash
# Server
NODE_ENV=development
PORT=3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://hopperru:password@localhost:5432/hopperru_dev

# Redis
REDIS_URL=redis://localhost:6379

# ClickHouse
CLICKHOUSE_URL=http://localhost:8123

# JWT (generate with: openssl genrsa 2048)
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# YooKassa (test credentials)
YOOKASSA_SHOP_ID=test_shop_id
YOOKASSA_SECRET_KEY=test_secret_key
YOOKASSA_WEBHOOK_SECRET=test_webhook_secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```
