# Feature: PWA Mobile Experience

**ID:** pwa-mobile
**Priority:** mvp
**Epic:** E4
**Status:** Done
**Branch:** feature/006-pwa-mobile
**Stories:** US-16

## Overview

Progressive Web App implementation with offline support, home screen installation, and push notification integration. Replaces the need for native mobile apps by providing a native-like experience through the browser. Includes a service worker with cache-first strategy for static assets, network-first for API calls, and an "Add to Home Screen" install banner.

## Architecture Decision

- **Service worker caching strategy:** Cache-first for static assets (with background revalidation), network-first for API calls (with offline fallback to cached responses).
- **Standalone display mode:** PWA runs without browser chrome when installed, providing a native app feel.
- **Install prompt with cooldown:** Custom install banner respects browser's `beforeinstallprompt` event, with 7-day dismissal cooldown stored in localStorage. iOS shows manual instructions.

## Implementation

### Files Changed

- `packages/web/public/manifest.json` -- PWA manifest: name "HopperRU", standalone display, theme color #1878EC, 192px/512px icons
- `packages/web/public/sw.js` -- Service worker: cache management, fetch interception, push notification handling, notification click routing
- `packages/web/src/components/InstallPrompt.tsx` -- "Add to Home Screen" banner with iOS detection and dismissal cooldown
- `packages/web/src/hooks/useServiceWorker.ts` -- React hook for SW registration, update detection, and cache management
- `packages/web/src/app/layout.tsx` -- Root layout with SW registration and install prompt

### Key Components

- **Service Worker (sw.js)** -- Three cache buckets: `hopperru-static-v2` (app shell), `hopperru-api-v2` (API responses), `hopperru-v2` (general). Handles push events with type-specific action buttons. Notification click routes to relevant pages.
- **InstallPrompt** -- Detects standalone mode, iOS vs Android, browser install prompt support. Shows dismissible banner with "Install" button (Android/Chrome) or manual instructions (iOS Safari).
- **useServiceWorker** -- Manages SW lifecycle: registration, update detection (`hasUpdate`), cache update application, and 60-minute update check interval.

## API Endpoints

Not applicable -- this is a client-side feature.

## Data Model

Not applicable -- uses browser Cache API and localStorage.

## Dependencies

- **auth-system** -- Auth state affects PWA navigation flows

## Testing

1. Verify `manifest.json` is served at `/manifest.json` with correct fields
2. Verify service worker registers successfully on page load
3. Test offline mode: disconnect network, verify cached pages load and API calls return "Offline" response
4. Test install prompt: clear localStorage, verify banner appears after `beforeinstallprompt` event
5. Test install prompt dismissal: verify 7-day cooldown in localStorage
6. Verify push notification routing: price-alert click goes to `/search`, booking-update click goes to `/booking/:id`
7. Test cache cleanup: old cache versions are deleted on SW activation

## Notes

- App shell URLs pre-cached on install: `/`, `/search`, `/dashboard`
- Push notifications include context-specific action buttons: price alerts get "Book" and "Freeze", booking updates get "View Details"
- Service worker uses `skipWaiting()` and `clients.claim()` for immediate activation
- Cache versioning: increment `v2` suffix in cache names to force cache refresh
- iOS Safari does not support the Web App Install API; the banner shows manual "Share > Add to Home Screen" instructions
