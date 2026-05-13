'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/**
 * "Add to Home Screen" banner component.
 *
 * Shows a dismissible banner when the browser fires the `beforeinstallprompt`
 * event (Chrome, Edge, Samsung Internet). On iOS Safari the prompt is purely
 * informational since Safari doesn't support the Web App Install API.
 *
 * The banner is suppressed for 7 days after dismissal (stored in localStorage).
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if already running as installed PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Already installed, no banner needed

    // Detect iOS for manual install instructions
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Check dismissal cooldown (7 days)
    const dismissedAt = localStorage.getItem('hopperru-install-dismissed');
    if (dismissedAt) {
      const dismissDate = new Date(dismissedAt);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (dismissDate > sevenDaysAgo) return;
    }

    // Listen for the browser's install prompt event
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault(); // Prevent the mini-infobar
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // On iOS, show the banner after a short delay (no native prompt)
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    if (result.outcome === 'accepted') {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setDeferredPrompt(null);
    localStorage.setItem('hopperru-install-dismissed', new Date().toISOString());
  }, []);

  // Don't render if already installed or banner not needed
  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center gap-4">
        {/* App icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
          <span className="text-white text-xl font-bold">H</span>
        </div>

        {/* Description */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">
            Установите HopperRU
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isIOS
              ? 'Нажмите «Поделиться» → «На экран Домой»'
              : 'Быстрый доступ, офлайн-режим и push-уведомления'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Установить
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
