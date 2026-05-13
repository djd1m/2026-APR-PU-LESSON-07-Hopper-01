'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface PushNotificationState {
  /** Current notification permission state */
  permission: PermissionState;
  /** Whether push is actively subscribed on this device */
  isSubscribed: boolean;
  /** Whether a subscribe/unsubscribe operation is in progress */
  isLoading: boolean;
  /** Request permission and subscribe to push notifications */
  subscribe: () => Promise<void>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<void>;
  /** Toggle subscription on/off */
  toggle: () => Promise<void>;
  /** Number of unread notifications (local counter) */
  unreadCount: number;
  /** Mark all notifications as read (resets counter) */
  markAllRead: () => void;
}

/**
 * Hook to request notification permission, subscribe to push via the
 * backend Web Push service, and handle incoming push messages.
 *
 * Stores the subscription state in localStorage to persist across sessions.
 * Uses the VAPID public key from the backend to create the push subscription.
 */
export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Determine initial permission state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as PermissionState);

    // Check if already subscribed
    const checkSubscription = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        // Service worker not ready yet
      }
    };

    checkSubscription();

    // Load unread count from localStorage
    const stored = localStorage.getItem('hopperru-unread-notifications');
    if (stored) {
      setUnreadCount(parseInt(stored, 10) || 0);
    }

    // Listen for push messages via service worker to increment unread count
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        setUnreadCount((prev) => {
          const next = prev + 1;
          localStorage.setItem('hopperru-unread-notifications', String(next));
          return next;
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * Convert a URL-safe base64 VAPID key to a Uint8Array for the Push API.
   */
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  const subscribe = useCallback(async () => {
    if (permission === 'unsupported') return;

    setIsLoading(true);
    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== 'granted') {
        return;
      }

      // Get VAPID public key from backend
      const { publicKey } = await apiClient<{ publicKey: string }>(
        '/notifications/vapid-key',
      );

      if (!publicKey) {
        console.error('[Push] No VAPID public key configured on server');
        return;
      }

      // Subscribe via the Push API
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = subscription.toJSON();

      // Send subscription to backend
      await apiClient('/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || '',
          },
          user_agent: navigator.userAgent,
        }),
      });

      setIsSubscribed(true);
      localStorage.setItem('hopperru-push-subscribed', 'true');
    } catch (error) {
      console.error('[Push] Subscription failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [permission, urlBase64ToUint8Array]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        // Notify backend
        await apiClient('/notifications/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        // Unsubscribe locally
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      localStorage.removeItem('hopperru-push-subscribed');
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    localStorage.setItem('hopperru-unread-notifications', '0');
  }, []);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    toggle,
    unreadCount,
    markAllRead,
  };
}
