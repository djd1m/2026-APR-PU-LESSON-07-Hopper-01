'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Telegram WebApp SDK types (subset used by HopperRU).
 * Full spec: https://core.telegram.org/bots/webapps
 */
interface TelegramWebApp {
  ready: () => void;
  close: () => void;
  expand: () => void;
  isExpanded: boolean;
  platform: string;
  version: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    start_param?: string;
    auth_date: number;
    hash: string;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface UseTelegramWebAppReturn {
  /** Whether the app is running inside Telegram WebApp */
  isTelegram: boolean;
  /** The Telegram WebApp instance (null if not in Telegram) */
  webApp: TelegramWebApp | null;
  /** Telegram user info */
  user: TelegramWebApp['initDataUnsafe']['user'] | null;
  /** Current color scheme */
  colorScheme: 'light' | 'dark';
  /** Theme params for styling */
  themeParams: TelegramWebApp['themeParams'];
  /** Show the main action button */
  showMainButton: (text: string, onClick: () => void) => void;
  /** Hide the main action button */
  hideMainButton: () => void;
  /** Show back button */
  showBackButton: (onClick: () => void) => void;
  /** Hide back button */
  hideBackButton: () => void;
  /** Trigger haptic feedback */
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => void;
  /** Close the Mini App */
  close: () => void;
  /** Platform string */
  platform: string;
}

/**
 * Hook for integrating with Telegram WebApp SDK.
 * Provides access to MainButton, BackButton, theme, user info, and haptics.
 * Safe to use outside Telegram (all methods become no-ops).
 */
export function useTelegramWebApp(): UseTelegramWebAppReturn {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setWebApp(tg);
      setIsTelegram(true);
    }
  }, []);

  const showMainButton = useCallback(
    (text: string, onClick: () => void) => {
      if (!webApp) return;
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    },
    [webApp]
  );

  const hideMainButton = useCallback(() => {
    webApp?.MainButton.hide();
  }, [webApp]);

  const showBackButton = useCallback(
    (onClick: () => void) => {
      if (!webApp) return;
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    },
    [webApp]
  );

  const hideBackButton = useCallback(() => {
    webApp?.BackButton.hide();
  }, [webApp]);

  const haptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => {
      if (!webApp) return;
      if (['light', 'medium', 'heavy'].includes(type)) {
        webApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
      } else {
        webApp.HapticFeedback.notificationOccurred(type as 'error' | 'success' | 'warning');
      }
    },
    [webApp]
  );

  const close = useCallback(() => {
    webApp?.close();
  }, [webApp]);

  return {
    isTelegram,
    webApp,
    user: webApp?.initDataUnsafe?.user || null,
    colorScheme: webApp?.colorScheme || 'light',
    themeParams: webApp?.themeParams || {},
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    haptic,
    close,
    platform: webApp?.platform || 'web',
  };
}
