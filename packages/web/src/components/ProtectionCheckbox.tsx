'use client';

import { useMemo } from 'react';

interface ProtectionCheckboxProps {
  type: 'cancel_for_any_reason' | 'price_drop' | string;
  title: string;
  description: string;
  price: number;
  bookingPrice?: number;
  checked: boolean;
  onChange: () => void;
}

/**
 * Protection product checkbox used during checkout.
 *
 * Displays real pricing and descriptions for CFAR and Price Drop protections
 * based on the booking price and product type.
 */
export function ProtectionCheckbox({
  type,
  title,
  description,
  price,
  bookingPrice,
  checked,
  onChange,
}: ProtectionCheckboxProps) {
  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' \u20BD';

  // Compute effective rate for display
  const effectiveRate = useMemo(() => {
    if (!bookingPrice || bookingPrice === 0) return null;
    return Math.round((price / bookingPrice) * 100);
  }, [price, bookingPrice]);

  // Type-specific styling and details
  const typeConfig = useMemo(() => {
    switch (type) {
      case 'cancel_for_any_reason':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          ),
          badge: 'АльфаСтрахование',
          badgeColor: 'bg-blue-100 text-blue-700',
          highlightColor: 'border-blue-300 bg-blue-50',
          details: [
            'Полный возврат стоимости билета (100%)',
            'Отмена не позднее 24ч до вылета',
            'Возврат в течение 5 рабочих дней',
            'Стоимость защиты не возвращается',
          ],
          partner: 'Страховой партнёр: АльфаСтрахование',
        };
      case 'price_drop':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              />
            </svg>
          ),
          badge: null,
          badgeColor: '',
          highlightColor: 'border-green-300 bg-green-50',
          details: [
            'Мониторинг цены 10 дней после бронирования',
            'Автоматический возврат разницы',
            'Макс. возврат: 50% стоимости билета',
            'Проверка каждые 30 минут',
          ],
          partner: null,
        };
      default:
        return {
          icon: null,
          badge: null,
          badgeColor: '',
          highlightColor: '',
          details: [],
          partner: null,
        };
    }
  }, [type]);

  return (
    <label
      className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
        checked
          ? typeConfig.highlightColor || 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {typeConfig.icon && (
                <span className={checked ? 'text-primary-500' : 'text-gray-400'}>
                  {typeConfig.icon}
                </span>
              )}
              <span className="font-medium text-gray-900">{title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {effectiveRate !== null && (
                <span className="text-xs text-gray-400">
                  ~{effectiveRate}%
                </span>
              )}
              <span className="font-semibold text-primary-500">
                {formatPrice(price)}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-500 mt-1">{description}</p>

          {/* Insurance partner badge */}
          {typeConfig.badge && (
            <span
              className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.badgeColor}`}
            >
              {typeConfig.badge}
            </span>
          )}

          {/* Expanded details when checked */}
          {checked && typeConfig.details.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200/60">
              <ul className="space-y-1">
                {typeConfig.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                    {detail}
                  </li>
                ))}
              </ul>
              {typeConfig.partner && (
                <p className="text-xs text-gray-400 mt-2 italic">
                  {typeConfig.partner}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </label>
  );
}
