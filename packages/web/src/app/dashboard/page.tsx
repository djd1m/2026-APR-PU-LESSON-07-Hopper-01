'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

interface SavingsData {
  total_savings: { amount: number; currency: string };
  breakdown: {
    freeze_savings: { amount: number; currency: string };
    prediction_savings: { amount: number; currency: string };
    price_drop_refunds: { amount: number; currency: string };
  };
  bookings_count: number;
}

interface BookingItem {
  id: string;
  origin: string;
  destination: string;
  departure_at: string;
  return_at: string | null;
  airline: string;
  flight_number: string;
  status: string;
  total_price: number;
  protections: string[];
  pnr: string;
  created_at: string;
}

interface BookingHistoryData {
  bookings: BookingItem[];
  total: number;
}

interface ReferralData {
  referral_code: string;
  referral_link: string;
  total_referrals: number;
  successful_referrals: number;
  bonus_earned: { amount: number; currency: string };
  bonus_available: { amount: number; currency: string };
  referrals: {
    name: string;
    status: string;
    bonus: number;
    joined_at: string;
  }[];
}

interface AlertItem {
  id: string;
  origin: string;
  destination: string;
  target_price: number;
  current_price?: number;
  active: boolean;
}

interface AlertsData {
  alerts: AlertItem[];
}

/** Animated counter that counts up from 0 to target value */
function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration]);

  return <>{value.toLocaleString('ru-RU')}</>;
}

export default function DashboardPage() {
  const [copied, setCopied] = useState(false);

  const { data: savings, isLoading: savingsLoading } = useQuery({
    queryKey: ['user-savings'],
    queryFn: () => apiClient<SavingsData>('/user/savings'),
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['user-bookings'],
    queryFn: () => apiClient<BookingHistoryData>('/user/bookings'),
  });

  const { data: referral, isLoading: referralLoading } = useQuery({
    queryKey: ['user-referral'],
    queryFn: () => apiClient<ReferralData>('/user/referral'),
  });

  const { data: alertsData } = useQuery({
    queryKey: ['user-alerts'],
    queryFn: () => apiClient<AlertsData>('/user/alerts'),
  });

  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' \u20BD';

  const isLoading = savingsLoading || bookingsLoading || referralLoading;

  const copyReferralLink = async () => {
    if (referral?.referral_link) {
      await navigator.clipboard.writeText(referral.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaWhatsApp = () => {
    if (referral?.referral_link) {
      const text = encodeURIComponent(
        `Присоединяйся к HopperRU! Экономь на авиабилетах с AI-прогнозами цен: ${referral.referral_link}`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const shareViaVK = () => {
    if (referral?.referral_link) {
      const url = encodeURIComponent(referral.referral_link);
      const title = encodeURIComponent('HopperRU — AI-предиктор цен на авиабилеты');
      window.open(`https://vk.com/share.php?url=${url}&title=${title}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        Загрузка...
      </div>
    );
  }

  const totalSavings = savings?.total_savings?.amount || 0;
  const bookings = bookingsData?.bookings || [];
  const alerts = alertsData?.alerts || [];
  const activeBookings = bookings.filter((b) =>
    ['CONFIRMED', 'TICKETED'].includes(b.status)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Личный кабинет</h1>

      {/* Stats cards with animated counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Общая экономия</p>
          <p className="text-3xl font-bold text-prediction-buy">
            <AnimatedCounter target={totalSavings} /> &#8381;
          </p>
          {savings?.breakdown && (
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <p>Заморозки: {formatPrice(savings.breakdown.freeze_savings.amount)}</p>
              <p>Прогнозы: {formatPrice(savings.breakdown.prediction_savings.amount)}</p>
              <p>Возвраты: {formatPrice(savings.breakdown.price_drop_refunds.amount)}</p>
            </div>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Активные бронирования</p>
          <p className="text-3xl font-bold text-primary-500">
            <AnimatedCounter target={activeBookings.length} duration={800} />
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Ценовые уведомления</p>
          <p className="text-3xl font-bold text-sunset">
            <AnimatedCounter target={alerts.length} duration={800} />
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Приглашено друзей</p>
          <p className="text-3xl font-bold text-purple-600">
            <AnimatedCounter target={referral?.total_referrals || 0} duration={800} />
          </p>
          {referral && referral.bonus_available.amount > 0 && (
            <p className="text-xs text-green-600 mt-1">
              Доступно бонусов: {formatPrice(referral.bonus_available.amount)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Booking history */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Мои бронирования</h2>
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm mb-3">Нет бронирований</p>
              <a href="/search" className="btn-primary inline-block text-sm px-6 py-2">
                Найти рейс
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <a
                  key={booking.id}
                  href={`/booking/${booking.id}`}
                  className="block p-4 rounded-lg border border-gray-100 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {booking.origin} &rarr; {booking.destination}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.airline} {booking.flight_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(booking.departure_at).toLocaleDateString('ru-RU')}
                        {booking.return_at && (
                          <> &mdash; {new Date(booking.return_at).toLocaleDateString('ru-RU')}</>
                        )}
                      </p>
                      {booking.protections.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {booking.protections.map((p) => (
                            <span
                              key={p}
                              className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"
                            >
                              {p === 'cancel_for_any_reason' ? 'CFAR' : p === 'price_drop' ? 'PriceDrop' : p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(booking.total_price)}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          booking.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700'
                            : booking.status === 'TICKETED'
                            ? 'bg-blue-100 text-blue-700'
                            : booking.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : booking.status === 'COMPLETED'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {translateStatus(booking.status)}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">PNR: {booking.pnr}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Active alerts */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Ценовые уведомления</h2>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm mb-3">Нет активных уведомлений</p>
              <a href="/search" className="btn-primary inline-block text-sm px-6 py-2">
                Создать уведомление
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border border-gray-100"
                >
                  <p className="font-medium">
                    {alert.origin} &rarr; {alert.destination}
                  </p>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">
                      Целевая: {formatPrice(alert.target_price)}
                    </span>
                    {alert.current_price !== undefined && (
                      <span
                        className={
                          alert.current_price <= alert.target_price
                            ? 'text-prediction-buy font-medium'
                            : 'text-gray-600'
                        }
                      >
                        Текущая: {formatPrice(alert.current_price)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Referral program */}
      <div className="card mt-8">
        <h2 className="font-semibold text-lg mb-4">Реферальная программа</h2>
        <p className="text-gray-600 mb-4">
          Приглашайте друзей и получайте бонусы на следующие покупки.
          За каждого зарегистрированного друга &mdash; 500 &#8381; на счёт.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <input
            className="input-field flex-1"
            readOnly
            value={referral?.referral_link || 'Загрузка...'}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            className="btn-primary whitespace-nowrap"
            onClick={copyReferralLink}
          >
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-gray-500">Поделиться:</span>
          <button
            onClick={shareViaWhatsApp}
            className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
          >
            WhatsApp
          </button>
          <button
            onClick={shareViaVK}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            ВКонтакте
          </button>
        </div>

        {referral && referral.referrals.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Ваши приглашения</h3>
            <div className="space-y-2">
              {referral.referrals.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <span className="font-medium text-sm">{r.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(r.joined_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {r.status === 'active' ? 'Активен' : 'Ожидание'}
                    </span>
                    {r.bonus > 0 && (
                      <span className="text-xs text-green-600 ml-2">
                        +{formatPrice(r.bonus)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p>
            Всего заработано: <strong>{formatPrice(referral?.bonus_earned?.amount || 0)}</strong>
            {' | '}
            Доступно: <strong className="text-green-600">{formatPrice(referral?.bonus_available?.amount || 0)}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Ожидает оплаты',
    CONFIRMED: 'Подтверждено',
    TICKETED: 'Билет выписан',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
  };
  return map[status] || status;
}
