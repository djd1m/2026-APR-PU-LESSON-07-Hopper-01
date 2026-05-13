'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * VK Bridge SDK types (subset used by HopperRU).
 * Full spec: https://dev.vk.com/bridge/overview
 */
interface VKBridge {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  subscribe: (callback: (event: VKBridgeEvent) => void) => void;
  unsubscribe: (callback: (event: VKBridgeEvent) => void) => void;
  isWebView: () => boolean;
}

interface VKBridgeEvent {
  detail: {
    type: string;
    data: Record<string, unknown>;
  };
}

interface VKUserInfo {
  id: number;
  first_name: string;
  last_name: string;
  photo_100?: string;
  city?: { title: string };
}

declare global {
  interface Window {
    vkBridge?: VKBridge;
  }
}

interface UseVKBridgeReturn {
  /** Whether the app is running inside VK Mini App */
  isVK: boolean;
  /** VK Bridge instance */
  bridge: VKBridge | null;
  /** Authenticated VK user info */
  user: VKUserInfo | null;
  /** Whether VK Bridge is ready */
  isReady: boolean;
  /** Get VK auth token with specified scope */
  getAuthToken: (scope: string) => Promise<string | null>;
  /** Share content to VK wall */
  shareToWall: (message: string, link?: string) => Promise<boolean>;
  /** Show VK native share dialog */
  showShareDialog: (link: string) => Promise<boolean>;
  /** Send notification to user */
  allowNotifications: () => Promise<boolean>;
  /** Show VK native banner ad (monetization) */
  showBannerAd: () => Promise<void>;
  /** Close the Mini App */
  close: () => void;
}

/**
 * Hook for integrating with VK Bridge SDK.
 * Provides VK auth, social sharing, notifications, and platform detection.
 * Safe to use outside VK (all methods become no-ops).
 */
export function useVKBridge(): UseVKBridgeReturn {
  const [bridge, setBridge] = useState<VKBridge | null>(null);
  const [isVK, setIsVK] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<VKUserInfo | null>(null);

  useEffect(() => {
    // Load VK Bridge SDK dynamically
    const initBridge = async () => {
      try {
        // Check if vkBridge is already loaded (SSR-safe)
        if (typeof window === 'undefined') return;

        let vkBridge = window.vkBridge;

        // Try dynamic import if not loaded via script tag
        if (!vkBridge) {
          try {
            const mod = await import('@vkontakte/vk-bridge');
            vkBridge = mod.default;
            window.vkBridge = vkBridge;
          } catch {
            // VK Bridge not available — not running in VK
            return;
          }
        }

        if (!vkBridge) return;

        // Initialize VK Bridge
        await vkBridge.send('VKWebAppInit');
        setBridge(vkBridge);
        setIsVK(true);
        setIsReady(true);

        // Get user info
        try {
          const userData = (await vkBridge.send('VKWebAppGetUserInfo')) as VKUserInfo;
          setUser(userData);
        } catch {
          console.warn('[vk-bridge] Failed to get user info');
        }
      } catch {
        console.warn('[vk-bridge] VK Bridge initialization failed');
      }
    };

    initBridge();
  }, []);

  const getAuthToken = useCallback(
    async (scope: string): Promise<string | null> => {
      if (!bridge) return null;
      try {
        const appId = process.env.NEXT_PUBLIC_VK_APP_ID || '0';
        const result = (await bridge.send('VKWebAppGetAuthToken', {
          app_id: parseInt(appId, 10),
          scope,
        })) as { access_token: string };
        return result.access_token;
      } catch {
        console.warn('[vk-bridge] Auth token request failed');
        return null;
      }
    },
    [bridge]
  );

  const shareToWall = useCallback(
    async (message: string, link?: string): Promise<boolean> => {
      if (!bridge) return false;
      try {
        await bridge.send('VKWebAppShowWallPostBox', {
          message,
          ...(link ? { attachments: link } : {}),
        });
        return true;
      } catch {
        return false;
      }
    },
    [bridge]
  );

  const showShareDialog = useCallback(
    async (link: string): Promise<boolean> => {
      if (!bridge) return false;
      try {
        await bridge.send('VKWebAppShare', { link });
        return true;
      } catch {
        return false;
      }
    },
    [bridge]
  );

  const allowNotifications = useCallback(async (): Promise<boolean> => {
    if (!bridge) return false;
    try {
      const result = (await bridge.send('VKWebAppAllowNotifications')) as { result: boolean };
      return result.result;
    } catch {
      return false;
    }
  }, [bridge]);

  const showBannerAd = useCallback(async (): Promise<void> => {
    if (!bridge) return;
    try {
      await bridge.send('VKWebAppShowBannerAd', {
        banner_location: 'bottom',
      });
    } catch {
      console.warn('[vk-bridge] Banner ad failed');
    }
  }, [bridge]);

  const close = useCallback(() => {
    if (bridge) {
      bridge.send('VKWebAppClose', { status: 'success' });
    }
  }, [bridge]);

  return {
    isVK,
    bridge,
    user,
    isReady,
    getAuthToken,
    shareToWall,
    showShareDialog,
    allowNotifications,
    showBannerAd,
    close,
  };
}
