# Feature: Authentication (Phone + Email)

**ID:** auth-system
**Priority:** mvp
**Epic:** E5
**Status:** Done
**Branch:** main
**Stories:** US-17

## Overview

Phone-based authentication system with SMS verification codes, JWT access/refresh token pairs, and 152-FZ (Russian data protection law) compliance. Users register with phone number and name, receive a 6-digit SMS code via SMSC.ru, and obtain JWT tokens upon verification.

## Architecture Decision

- **Phone-first auth:** Russian market standard; no password needed. SMS code is the primary authentication factor.
- **JWT with rotation:** 15-minute access tokens + 7-day refresh tokens. Refresh token hash stored in DB to detect reuse (possible token theft).
- **SMSC.ru integration:** Russian SMS gateway with mock fallback when credentials are not configured (code logged to console in dev).
- **Upsert registration:** Single endpoint handles both new user creation and existing user code re-send.

## Implementation

### Files Changed

- `packages/api/src/auth/auth.service.ts` -- Core auth logic: register, verify, refresh, validate
- `packages/api/src/auth/auth.controller.ts` -- REST endpoints with Swagger docs
- `packages/api/src/auth/auth.dto.ts` -- RegisterDto, VerifyCodeDto, RefreshTokenDto with validation
- `packages/api/src/auth/auth.guard.ts` -- JwtAuthGuard (CanActivate) for protected routes
- `packages/api/src/auth/auth.module.ts` -- NestJS module with JwtModule registration
- `packages/web/src/app/auth/page.tsx` -- Two-step auth UI (phone input, then SMS code)
- `packages/web/src/lib/auth.ts` -- Client-side auth utilities (register, verify, isAuthenticated)
- `packages/web/src/components/AuthGuard.tsx` -- React component that redirects unauthenticated users

### Key Components

- **AuthService** -- Manages user registration (upsert), SMS code generation (6-digit, 5-min expiry), code verification, JWT issuance, and refresh token rotation with SHA-256 hashing
- **JwtAuthGuard** -- NestJS guard that extracts Bearer token from Authorization header, verifies JWT, and attaches payload to request
- **AuthPage** -- Two-step React form with phone/name input, countdown timer for resend (60s cooldown), and auto-focus on code input

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register/send SMS code (phone + name) |
| POST | `/auth/verify` | No | Verify SMS code, get JWT token pair |
| POST | `/auth/refresh` | No | Refresh token pair (rotate refresh token) |
| GET | `/auth/me` | Bearer | Get authenticated user profile |

## Data Model

- **User** -- id (UUID), telegram_id, email, phone (unique), name, home_airport (default SVO), preferences (JSON), verification_code, verification_expires, refresh_token_hash, created_at, updated_at, deleted_at

## Dependencies

None -- this is a foundational feature.

## Testing

1. POST `/auth/register` with phone `+79991234567` and name -- should return success message
2. POST `/auth/verify` with correct 6-digit code -- should return accessToken, refreshToken, and user object
3. Verify expired code (>5 min) returns 400
4. Verify wrong code returns 401
5. POST `/auth/refresh` with valid refresh token -- should return new token pair
6. Verify refresh token reuse detection: using same refresh token twice should invalidate session
7. GET `/auth/me` with Bearer token -- should return user data

## Notes

- Phone normalization handles Russian formats: 8XXXXXXXXXX, 7XXXXXXXXXX, 9XXXXXXXXXX all normalize to +7XXXXXXXXXX
- Refresh token reuse triggers session invalidation (sets refresh_token_hash to null) as a security measure
- SMSC.ru SMS gateway falls back to console logging when `SMSC_LOGIN`/`SMSC_PASSWORD` env vars are not set
- 152-FZ compliance notice shown on registration form
- Access token secret defaults to `dev-secret-change-me` in development
