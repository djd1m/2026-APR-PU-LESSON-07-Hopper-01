'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  /** Whether the service worker is registered and active */
  isReady: boolean;
  /** Whether a new service worker update is available */
  hasUpdate: boolean;
  /** Whether the browser supports service workers */
  isSupported: boolean;
  /** Current registration object */
  registration: ServiceWorkerRegistration | null;
  /** Apply pending update (reloads page) */
  applyUpdate: () => void;
}

/**
 * Hook to register and manage the service worker lifecycle.
 * Handles registration, update detection, and cache versioning.
 */
export function useServiceWorker(): ServiceWorkerState {
  const [isReady, setIsReady] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  useEffect(() => {
    if (!isSupported) return;

    let mounted = true;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        if (!mounted) return;

        setRegistration(reg);

        // Check if SW is already active
        if (reg.active) {
          setIsReady(true);
        }

        // Listen for new service worker becoming active
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              if (mounted) setIsReady(true);
            }
            // Detect waiting worker = update available
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (mounted) setHasUpdate(true);
            }
          });
        });

        // Handle controller change (new SW took over)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Only reload if we had a previous controller (skip initial registration)
          if (navigator.serviceWorker.controller) {
            // The new service worker has taken control
          }
        });

        // Check for updates every 60 minutes
        const updateInterval = setInterval(() => {
          reg.update().catch(() => {
            // Silently fail — user may be offline
          });
        }, 60 * 60 * 1000);

        return () => clearInterval(updateInterval);
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    };

    registerSW();

    return () => {
      mounted = false;
    };
  }, [isSupported]);

  const applyUpdate = useCallback(() => {
    if (!registration?.waiting) return;

    // Tell the waiting service worker to skip waiting and become active
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload to pick up the new service worker
    window.location.reload();
  }, [registration]);

  return {
    isReady,
    hasUpdate,
    isSupported,
    registration,
    applyUpdate,
  };
}
