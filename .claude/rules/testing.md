# Testing Rules: HopperRU

Test strategy derived from `docs/Refinement.md`. Applies to all code changes.

## Test Pyramid

```
        /-------------\
       /   E2E (5%)    \        Playwright: 5 critical user journeys
      / Integration (15%) \     Supertest + Testcontainers: API + real DB
     /     Unit (80%)       \   Jest (Node) + pytest (Python): business logic
    /------------------------\
```

## Coverage Targets

| Layer | Framework | Target | Measured By |
|-------|-----------|--------|-------------|
| Unit (NestJS) | Jest | 80% line coverage | `jest --coverage` |
| Unit (Python ML) | pytest | 80% line coverage | `pytest --cov` |
| Unit (Frontend) | Vitest + Testing Library | 70% line coverage | `vitest --coverage` |
| Integration | Supertest + Testcontainers | 60% critical paths | Manual tracking |
| E2E | Playwright | 5 critical journeys | Journey pass rate |

**CI enforcement:** Coverage below target fails the pipeline. Coverage is checked per-package, not globally.

## Test Naming Convention

### Unit Tests

```typescript
describe('BookingService', () => {
  describe('create', () => {
    it('should create a booking with PENDING status when payment is initiated', async () => {
      // ...
    });

    it('should throw FreezeLimitExceededException when user has 3 active freezes', async () => {
      // ...
    });

    it('should reject booking when flight has no available seats', async () => {
      // ...
    });
  });
});
```

**Pattern:** `should <expected behavior> when <condition>`

### Integration Tests

```typescript
describe('POST /api/v1/bookings', () => {
  it('should return 201 and create a booking in the database', async () => {
    // ...
  });

  it('should return 409 when concurrent booking depletes seats', async () => {
    // ...
  });

  it('should return 401 when JWT is missing', async () => {
    // ...
  });
});
```

**Pattern:** `should return <status> [and <side effect>] [when <condition>]`

### E2E Tests

```typescript
test('User can search, freeze price, and book at frozen price', async ({ page }) => {
  // Step 1: Search for a flight
  // Step 2: Purchase price freeze
  // Step 3: Return later and book using frozen price
  // Step 4: Verify booking confirmation
});
```

**Pattern:** `User can <complete journey description>`

## File Organization

```
packages/api/src/modules/booking/
  booking.service.ts
  booking.service.spec.ts          # Unit tests (co-located)
  booking.repository.ts
  booking.repository.spec.ts       # Unit tests (co-located)
  booking.controller.spec.ts       # Thin controller tests
  __tests__/
    booking.integration.spec.ts    # Integration tests (separate dir)

packages/api/test/
  e2e/
    search-to-booking.e2e.spec.ts  # E2E tests (top-level)
    price-freeze-flow.e2e.spec.ts
    cfar-cancellation.e2e.spec.ts
    telegram-booking.e2e.spec.ts
    price-drop-protection.e2e.spec.ts
```

## Mock Patterns for External APIs

### Airline API Mock

```typescript
// test/mocks/airline-provider.mock.ts
export const createMockAirlineProvider = (): jest.Mocked<FlightProvider> => ({
  search: jest.fn().mockResolvedValue([
    createFlightFixture({ origin: 'SVO', destination: 'AER', price: 8500 }),
    createFlightFixture({ origin: 'SVO', destination: 'AER', price: 12000 }),
  ]),
  getPrice: jest.fn().mockResolvedValue({ amount: 8500, currency: 'RUB' }),
  book: jest.fn().mockResolvedValue({ pnr: 'ABC123', status: 'CONFIRMED' }),
  cancel: jest.fn().mockResolvedValue({ status: 'CANCELLED', refundAmount: 8500 }),
});

// For integration tests: WireMock container
export const airlineWireMock = new GenericContainer('wiremock/wiremock:3.3.1')
  .withExposedPorts(8080)
  .withCopyFilesToContainer([{
    source: 'test/fixtures/wiremock/airline',
    target: '/home/wiremock/mappings',
  }]);
```

### YooKassa Mock

```typescript
// test/mocks/yookassa.mock.ts
export const createMockYooKassa = () => ({
  createPayment: jest.fn().mockResolvedValue({
    id: 'pay_test_123',
    status: 'pending',
    confirmation: { type: 'redirect', confirmationUrl: 'https://yookassa.ru/pay/test' },
  }),
  getPayment: jest.fn().mockResolvedValue({
    id: 'pay_test_123',
    status: 'succeeded',
    amount: { value: '8500.00', currency: 'RUB' },
    paymentMethod: { type: 'sbp' },
  }),
  createRefund: jest.fn().mockResolvedValue({
    id: 'refund_test_456',
    status: 'succeeded',
    amount: { value: '8500.00', currency: 'RUB' },
  }),
});

// Webhook payload factory
export const createYooKassaWebhook = (
  event: 'payment.succeeded' | 'payment.canceled' | 'refund.succeeded',
  paymentId: string,
  overrides?: Partial<YooKassaNotification>,
) => ({
  type: 'notification',
  event,
  object: {
    id: paymentId,
    status: event === 'payment.succeeded' ? 'succeeded' : 'canceled',
    amount: { value: '8500.00', currency: 'RUB' },
    ...overrides,
  },
});
```

### Insurance Partner Mock

```typescript
// test/mocks/insurance-partner.mock.ts
export const createMockInsurancePartner = () => ({
  createPolicy: jest.fn().mockResolvedValue({
    policyId: 'INS-2026-001',
    status: 'active',
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }),
  submitClaim: jest.fn().mockResolvedValue({
    claimId: 'CLM-2026-001',
    status: 'processing',
    estimatedResolution: '3-5 business days',
  }),
  getClaimStatus: jest.fn().mockResolvedValue({
    claimId: 'CLM-2026-001',
    status: 'approved',
    payoutAmount: { value: '8500.00', currency: 'RUB' },
  }),
});
```

## Fixture Management

### Factory Functions

```typescript
// test/fixtures/factories.ts
import { faker } from '@faker-js/faker';

export const createUserFixture = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  telegramId: faker.string.numeric(10),
  email: faker.internet.email(),
  phone: `+7${faker.string.numeric(10)}`,
  name: faker.person.fullName(),
  homeAirport: 'SVO',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

export const createFlightFixture = (overrides?: Partial<Flight>): Flight => ({
  id: faker.string.uuid(),
  airline: faker.helpers.arrayElement(['SU', 'S7', 'DP', 'U6', 'FV']),
  flightNumber: `${faker.helpers.arrayElement(['SU', 'S7', 'DP'])}-${faker.string.numeric(4)}`,
  origin: faker.helpers.arrayElement(['SVO', 'DME', 'VKO']),
  destination: faker.helpers.arrayElement(['AER', 'LED', 'KRR', 'SVX']),
  departureAt: faker.date.future(),
  arrivalAt: faker.date.future(),
  durationMin: faker.number.int({ min: 60, max: 600 }),
  cabinClass: 'ECONOMY',
  stops: 0,
  availableSeats: faker.number.int({ min: 1, max: 180 }),
  price: { amount: faker.number.int({ min: 3000, max: 50000 }), currency: 'RUB' },
  fetchedAt: new Date(),
  source: 'API_DIRECT',
  ...overrides,
});

export const createBookingFixture = (overrides?: Partial<Booking>): Booking => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  type: 'FLIGHT',
  status: 'CONFIRMED',
  totalPrice: { amount: 12000, currency: 'RUB' },
  paymentId: `pay_${faker.string.alphanumeric(24)}`,
  pnr: faker.string.alpha({ length: 6, casing: 'upper' }),
  createdAt: new Date(),
  confirmedAt: new Date(),
  cancelledAt: null,
  ...overrides,
});

export const createPriceFreezeFixture = (overrides?: Partial<PriceFreeze>): PriceFreeze => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  flightId: faker.string.uuid(),
  frozenPrice: { amount: 8500, currency: 'RUB' },
  freezeFee: { amount: 2500, currency: 'RUB' },
  status: 'ACTIVE',
  expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  usedAt: null,
  bookingId: null,
  ...overrides,
});
```

**Rules:**
- Use `@faker-js/faker` for realistic test data
- Every factory accepts `overrides` partial for customization
- Deterministic seeding in CI: `faker.seed(12345)` in test setup
- Shared fixtures in `test/fixtures/`, not duplicated across test files

### Database Seeding (Integration Tests)

```typescript
// test/helpers/seed.ts
export async function seedTestDatabase(prisma: PrismaClient) {
  const user = await prisma.user.create({ data: createUserFixture() });
  const flights = await Promise.all(
    Array.from({ length: 5 }, () =>
      prisma.flight.create({ data: createFlightFixture() })
    ),
  );
  return { user, flights };
}

export async function cleanTestDatabase(prisma: PrismaClient) {
  await prisma.$executeRaw`TRUNCATE TABLE bookings, price_freezes, protections, users CASCADE`;
}
```

## 5 Critical E2E Journeys

| # | Journey | Steps | Pass Criteria |
|---|---------|-------|---------------|
| E2E-01 | Search to Booking | Search MOW->LED -> Select flight -> Pay via SBP -> Receive confirmation | Booking status = CONFIRMED, e-ticket generated |
| E2E-02 | Price Freeze Flow | Search -> Get prediction "Wait" -> Purchase Price Freeze -> Return in 7 days -> Book at frozen price | Frozen price applied at checkout |
| E2E-03 | Cancel For Any Reason | Book flight -> Purchase CFAR -> Cancel booking -> Receive full refund | Refund processed, insurance claim filed |
| E2E-04 | Telegram Bot Booking | /start -> Search via inline -> Select -> Pay (YooKassa redirect) -> Confirmation in chat | All steps complete within Telegram |
| E2E-05 | Price Drop Protection | Book flight -> Purchase PDP -> Price drops by 15% -> Receive difference refund | Automatic refund of price difference |

## Test Environment

### Testcontainers Setup

```typescript
// test/helpers/containers.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';

export async function startTestContainers() {
  const postgres = await new PostgreSqlContainer('postgres:16')
    .withDatabase('hopperru_test')
    .start();

  const redis = await new GenericContainer('redis:7')
    .withExposedPorts(6379)
    .start();

  return {
    databaseUrl: postgres.getConnectionUri(),
    redisUrl: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
    cleanup: async () => {
      await postgres.stop();
      await redis.stop();
    },
  };
}
```

### Test Commands

```bash
# Unit tests (fast, no containers)
npm run test                        # All packages
npm run test -- --watch             # Watch mode
npm run test -- --coverage          # With coverage

# Integration tests (requires Docker)
npm run test:integration

# E2E tests (requires full stack running)
npm run test:e2e

# ML tests
cd packages/ml && pytest --cov=src

# All tests (CI)
npm run test:ci                     # Unit + Integration + Coverage check
```

## Test Anti-Patterns (Flag in Review)

| Anti-Pattern | Why Bad | Fix |
|-------------|---------|-----|
| Mocking the database in integration tests | Tests pass but queries fail in production | Use Testcontainers |
| Tests without assertions | False confidence, test always passes | Add explicit `expect()` |
| Shared mutable state between tests | Flaky, order-dependent tests | Reset state in `beforeEach` |
| Snapshot tests for API responses | Brittle, unclear what actually matters | Assert on specific fields |
| Testing implementation details | Tests break on refactor without behavior change | Test behavior via public API |
| No error-path tests | Happy path works, errors crash production | Test every thrown exception |
| Missing boundary tests for money | Off-by-one cent in financial calculations | Test with edge amounts (0, max, negative) |
| Skipped tests (`it.skip`) without issue link | Forgotten, accumulates debt | Add `// TODO(#issue):` or delete |
| Test timeout >30s (unit) | Likely testing wrong layer | Move to integration or mock slow deps |
| No cleanup after integration test | Leaks state to next test run | Use `afterAll` cleanup |
