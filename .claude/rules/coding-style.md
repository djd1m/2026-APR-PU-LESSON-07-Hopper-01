# Coding Style Rules: HopperRU

Conventions for the HopperRU codebase. All code must follow these standards.
Enforced by ESLint, Prettier, and code review.

## TypeScript Configuration

```jsonc
// tsconfig.json base settings (all packages inherit)
{
  "compilerOptions": {
    "strict": true,                    // MANDATORY: all strict checks enabled
    "noUncheckedIndexedAccess": true,  // Array/object access returns T | undefined
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

**Rules:**
- No `any` type. Use `unknown` + type narrowing instead.
- No type assertions (`as`) except in test files. Prefer type guards.
- No non-null assertions (`!`). Handle the `null`/`undefined` case explicitly.
- Prefer `interface` over `type` for object shapes.
- Use `const` assertions for literal objects and tuples.

## NestJS Conventions

### Modules

- One module per domain (User, Search, Booking, Fintech, Prediction, Notification, Payment)
- Module file is the only place where providers are registered
- Avoid `@Global()` modules. Import explicitly.
- Use `forRoot()` / `forRootAsync()` for configurable modules (database, redis, queue)

### Controllers

```typescript
@Controller('api/v1/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ): Promise<ApiResponse<BookingResponseDto>> {
    const booking = await this.bookingService.create(user.id, dto);
    return { data: BookingResponseDto.from(booking) };
  }
}
```

**Rules:**
- Controllers contain NO business logic. Delegate everything to services.
- Always use `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- Return typed response DTOs, never raw Prisma models.
- Use custom decorators for common patterns (`@CurrentUser()`, `@ApiPagination()`).

### Services

```typescript
@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly paymentService: PaymentService,
    private readonly eventBus: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    // Business logic here
  }
}
```

**Rules:**
- Services contain all business logic.
- Services call repositories for data access, never Prisma directly.
- Services emit domain events via `EventEmitter2` for cross-cutting concerns (notifications, analytics).
- Services throw domain-specific exceptions (see Error Handling).

### DTOs (Data Transfer Objects)

```typescript
import { IsString, IsDateString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchFlightsDto {
  @ApiProperty({ example: 'SVO' })
  @IsString()
  @Length(3, 3)
  origin: string;

  @ApiProperty({ example: 'AER' })
  @IsString()
  @Length(3, 3)
  destination: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  departureDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  passengers?: number;
}
```

**Rules:**
- Separate DTOs for create, update, and response.
- Use `class-validator` decorators for all input validation.
- Use `class-transformer` for response mapping (`plainToInstance`, `Exclude`, `Expose`).
- Response DTOs have a static `from()` factory method that maps from domain entities.
- Never expose internal IDs or sensitive fields in response DTOs unless needed.

### Repositories

```typescript
@Injectable()
export class BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string, status?: BookingStatus): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: { userId, ...(status && { status }), deletedAt: null },
      select: { /* explicit fields */ },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

**Rules:**
- One repository per aggregate root entity.
- Always use `select` (never fetch full models with relations by default).
- Always include `deletedAt: null` in queries for soft-deletable tables.
- Repository methods return domain types, not Prisma-generated types.

## Prisma ORM Patterns

### Schema Conventions

```prisma
model Booking {
  id              String        @id @default(uuid())
  userId          String        @map("user_id")
  status          BookingStatus @default(PENDING)
  totalPrice      Decimal       @map("total_price") @db.Decimal(12, 2)
  paymentId       String?       @map("payment_id")
  pnr             String?
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  deletedAt       DateTime?     @map("deleted_at")

  user            User          @relation(fields: [userId], references: [id])
  passengers      Passenger[]
  protections     Protection[]

  @@map("bookings")
  @@index([userId, status])
}
```

**Rules:**
- Model names: `PascalCase` singular (`Booking`, not `Bookings`)
- Column mapping: `@map("snake_case")` for all multi-word columns
- Table mapping: `@@map("snake_case_plural")`
- Always include `createdAt`, `updatedAt`. Add `deletedAt` for PII tables.
- Monetary values: `Decimal @db.Decimal(12, 2)`
- Relations: explicit field mapping, never rely on implicit naming

### Migration Discipline

- One migration per logical change (not per deploy)
- Migration names: `YYYYMMDDHHMMSS_description` (auto-generated by Prisma)
- Never edit existing migrations. Create a new one for fixes.
- Always run `prisma generate` after schema changes (enforced in CI)
- Test migrations against a fresh database AND against a populated database

## Error Handling

### Exception Hierarchy

```typescript
// Base domain exception
export class DomainException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

// Specific exceptions
export class FreezeLimitExceededException extends DomainException {
  constructor(current: number, max: number) {
    super('FREEZE_LIMIT_EXCEEDED', `Максимум ${max} активных заморозки`, { current, max });
  }
}

export class FreezeExpiredException extends DomainException {
  constructor(freezeId: string) {
    super('FREEZE_EXPIRED', 'Заморозка истекла', { freezeId });
  }
}

export class PaymentFailedException extends DomainException {
  constructor(paymentId: string, reason: string) {
    super('PAYMENT_FAILED', `Платёж не прошёл: ${reason}`, { paymentId });
  }
}
```

### NestJS Exception Filter

```typescript
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = this.mapToHttpStatus(exception.code);

    response.status(status).json({
      error: {
        code: exception.code,
        message: exception.message,
        details: exception.details,
      },
      meta: {
        requestId: ctx.getRequest().id,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

**Rules:**
- Never throw raw `Error`. Use `DomainException` subclasses.
- Never catch and swallow errors silently. Log and rethrow or handle.
- External API errors: wrap in a domain exception with context (provider name, original error code).
- All error messages user-facing must be in Russian.
- Internal error details (stack traces, SQL errors) are logged but never exposed to the client.

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (TypeScript) | `kebab-case` | `booking.service.ts`, `create-booking.dto.ts` |
| Files (test) | `kebab-case.spec.ts` | `booking.service.spec.ts` |
| Classes | `PascalCase` | `BookingService`, `CreateBookingDto` |
| Interfaces | `PascalCase` (no `I` prefix) | `FlightProvider`, not `IFlightProvider` |
| Methods | `camelCase` | `createBooking`, `findByUserId` |
| Variables | `camelCase` | `totalPrice`, `currentUser` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_ACTIVE_FREEZES`, `FREEZE_DURATION_DAYS` |
| Enum members | `SCREAMING_SNAKE_CASE` | `BookingStatus.CONFIRMED` |
| DB tables | `snake_case` plural | `bookings`, `price_freezes` |
| DB columns | `snake_case` | `user_id`, `created_at`, `total_price` |
| API endpoints | `kebab-case` | `/api/v1/price-alerts` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `DATABASE_URL`, `YOOKASSA_SECRET_KEY` |

## Import Order

Enforce with ESLint `import/order` rule:

```typescript
// 1. Node built-ins
import { readFile } from 'node:fs/promises';

// 2. External packages
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 3. Monorepo packages
import { Money, BookingStatus } from '@hopperru/shared';

// 4. Internal modules (absolute paths within package)
import { PrismaService } from '../prisma/prisma.service';

// 5. Same module (relative paths)
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingRepository } from './booking.repository';
```

Blank line between each group. Alphabetical within each group.

## Formatting (Prettier)

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## Comments

- Avoid obvious comments (`// increment counter` on `counter++`).
- Use JSDoc for public service methods with `@param`, `@returns`, `@throws`.
- Use `// TODO(username):` for planned work with a linked issue or feature name.
- Use `// HACK:` for intentional workarounds with explanation of why.
- All comments in English (code comments). User-facing strings in Russian.

## Anti-Patterns to Avoid

- `any` type anywhere in non-test code
- Business logic in controllers
- Direct Prisma calls in services (use repositories)
- Raw SQL without extreme justification and security review
- Mutable global state
- Default exports (use named exports exclusively)
- Barrel files (`index.ts` re-exporting everything) -- import directly from source
- Magic numbers without named constants
- String-based enums for domain states (use TypeScript enums or const objects)
- Nested ternaries (use early returns or switch/case)
