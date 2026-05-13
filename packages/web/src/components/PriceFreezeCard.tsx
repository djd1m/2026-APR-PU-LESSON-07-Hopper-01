'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';

interface PriceFreezeData {
  id: string;
  flight_id: string;
  frozen_price: { amount: number; currency: string };
  freeze_fee: { amount: number; currency: string };
  status: string;
  expires_at: string;
  created_at: string;
  remaining_days: number;
  current_market_price?: { amount: number; currency: string } | null;
}

interface PriceFreezeCardProps {
  freezeId: string;
  /** Callback when user clicks "Use freeze to book" */
  onUseFreeze?: (result: UseFreezeResult) => void;
  /** Callback when freeze is expired or used */
  onStatusChange?: (freezeId: string, newStatus: string) => void;
}

interface UseFreezeResult {
  booking_price: { amount: number; currency: string };
  market_price: { amount: number; currency: string };
  frozen_price: { amount: number; currency: string };
  savings: { amount: number; currency: string };
  source: 'freeze_lower' | 'market_lower';
}

const formatPrice = (amount: number) =>
  amount.toLocaleString('ru-RU') + ' \u20BD';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * Card component showing a frozen price with countdown, price comparison,
 * and "Use" button. Fetches freeze details from the API on mount.
 */
export function PriceFreezeCard({
  freezeId,
  onUseFreeze,
  onStatusChange,
}: PriceFreezeCardProps) {
  const [freeze, setFreeze] = useState<PriceFreezeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsing, setIsUsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch freeze details
  useEffect(() => {
    let cancelled = false;

    const fetchFreeze = async () => {
      try {
        const data = await apiClient<{ freeze: PriceFreezeData }>(
          `/freeze/${freezeId}`,
        );
        if (!cancelled) {
          setFreeze(data.freeze);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Не удалось загрузить данные заморозки');
          setIsLoading(false);
        }
      }
    };

    fetchFreeze();
    // Refresh every 5 minutes while active
    const interval = setInterval(fetchFreeze, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [freezeId]);

  const handleUseFreeze = useCallback(async () => {
    setIsUsing(true);
    setError(null);

    try {
      const result = await apiClient<UseFreezeResult>(`/freeze/${freezeId}/use`, {
        method: 'POST',
      });

      setFreeze((prev) =>
        prev ? { ...prev, status: 'used', remaining_days: 0 } : null,
      );

      onUseFreeze?.(result);
      onStatusChange?.(freezeId, 'used');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось использовать заморозку',
      );
    } finally {
      setIsUsing(false);
    }
  }, [freezeId, onUseFreeze, onStatusChange]);

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-6 h-48" />
    );
  }

  if (!freeze) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
        {error || 'Заморозка не найдена'}
      </div>
    );
  }

  const isActive = freeze.status === 'active';
  const savings =
    freeze.current_market_price && isActive
      ? freeze.current_market_price.amount - freeze.frozen_price.amount
      : 0;
  const hasSavings = savings > 0;

  // Urgency indicator based on remaining days
  const urgencyColor =
    freeze.remaining_days <= 3
      ? 'text-red-600'
      : freeze.remaining_days <= 7
        ? 'text-orange-500'
        : 'text-green-600';

  // Status badge
  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Активна', color: 'bg-green-100 text-green-700' },
    used: { label: 'Использована', color: 'bg-blue-100 text-blue-700' },
    expired: { label: 'Истекла', color: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Отменена', color: 'bg-gray-100 text-gray-600' },
    refunded: { label: 'Возвращена', color: 'bg-purple-100 text-purple-700' },
  };

  const statusInfo = statusConfig[freeze.status] || statusConfig.expired;

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-colors ${
        isActive
          ? hasSavings
            ? 'border-green-300 bg-green-50'
            : 'border-primary-300 bg-primary-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-gray-200/50">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-semibold text-gray-900">Заморозка цены</span>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Frozen price */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Замороженная цена
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(freeze.frozen_price.amount)}
            </p>
          </div>
          {isActive && freeze.current_market_price && (
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Текущая цена
              </p>
              <p className="text-lg font-semibold text-gray-600">
                {formatPrice(freeze.current_market_price.amount)}
              </p>
            </div>
          )}
        </div>

        {/* Savings indicator */}
        {isActive && hasSavings && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-lg">
            <svg
              className="w-4 h-4 text-green-600 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-green-700">
              Вы экономите {formatPrice(savings)} по сравнению с текущей ценой
            </span>
          </div>
        )}

        {/* Countdown */}
        {isActive && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Осталось дней:</span>
            <span className={`text-lg font-bold ${urgencyColor}`}>
              {freeze.remaining_days}
              {freeze.remaining_days <= 3 && (
                <span className="text-xs font-normal ml-1">
                  — скоро истечёт!
                </span>
              )}
            </span>
          </div>
        )}

        {/* Dates info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Создана: {formatDate(freeze.created_at)}</span>
          <span>
            {isActive
              ? `Истекает: ${formatDate(freeze.expires_at)}`
              : `Стоимость заморозки: ${formatPrice(freeze.freeze_fee.amount)}`}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {error}
          </div>
        )}

        {/* Action button */}
        {isActive && (
          <button
            onClick={handleUseFreeze}
            disabled={isUsing}
            className="w-full py-3 px-4 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUsing ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Обработка...
              </span>
            ) : (
              `Забронировать за ${formatPrice(
                freeze.current_market_price
                  ? Math.min(
                      freeze.frozen_price.amount,
                      freeze.current_market_price.amount,
                    )
                  : freeze.frozen_price.amount,
              )}`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
