'use client';

import { useState, useRef, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * Bell icon component for the header navigation.
 * Shows unread notification count badge and toggles push permission.
 *
 * States:
 * - Default: bell outline, click opens dropdown with "Enable notifications" CTA
 * - Subscribed: solid bell, badge shows unread count, click opens dropdown
 * - Denied: bell with slash, click shows instructions to enable in browser settings
 * - Unsupported: hidden (browser doesn't support push)
 */
export function NotificationBell() {
  const {
    permission,
    isSubscribed,
    isLoading,
    toggle,
    unreadCount,
    markAllRead,
  } = usePushNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Don't render if browser doesn't support push
  if (permission === 'unsupported') return null;

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (isOpen && unreadCount > 0) {
      markAllRead();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-primary-500 transition-colors"
        aria-label={`Уведомления${unreadCount > 0 ? ` (${unreadCount} новых)` : ''}`}
      >
        {permission === 'denied' ? (
          // Bell with slash — notifications blocked
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        ) : isSubscribed ? (
          // Solid bell — subscribed
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C11.172 2 10.5 2.672 10.5 3.5V4.194C7.91 4.862 6 7.206 6 10V15L4 17V18H20V17L18 15V10C18 7.206 16.09 4.862 13.5 4.194V3.5C13.5 2.672 12.828 2 12 2ZM12 22C13.105 22 14 21.105 14 20H10C10 21.105 10.895 22 12 22Z" />
          </svg>
        ) : (
          // Outline bell — not subscribed
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        )}

        {/* Unread count badge */}
        {isSubscribed && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            {permission === 'denied' ? (
              // Blocked state
              <div className="text-center">
                <div className="text-gray-400 mb-2">
                  <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </div>
                <p className="font-medium text-gray-900">Уведомления заблокированы</p>
                <p className="text-sm text-gray-500 mt-1">
                  Разрешите уведомления в настройках браузера, чтобы получать оповещения
                  о снижении цен и обновлениях бронирований.
                </p>
              </div>
            ) : isSubscribed ? (
              // Subscribed state
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Уведомления</h3>
                  <button
                    onClick={toggle}
                    disabled={isLoading}
                    className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {isLoading ? 'Отключение...' : 'Отключить'}
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 mt-1.5 bg-green-500 rounded-full flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Push-уведомления активны</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Вы будете получать оповещения о ценах и бронированиях
                      </p>
                    </div>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">&#10003;</span>
                      Снижение цен на отслеживаемых маршрутах
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">&#10003;</span>
                      Обновления статуса бронирований
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">&#10003;</span>
                      Истечение заморозок цен
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">&#10003;</span>
                      Возвраты по защите от снижения цены
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              // Not subscribed state
              <div className="text-center">
                <div className="text-primary-500 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <p className="font-medium text-gray-900">Включите уведомления</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Получайте мгновенные оповещения о снижении цен на авиабилеты
                  и обновлениях ваших бронирований.
                </p>
                <button
                  onClick={toggle}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Подключение...' : 'Включить уведомления'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
