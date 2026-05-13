'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface PartnerAnalytics {
  analytics: {
    partner_id: string;
    period: string;
    bookings: {
      total: number;
      confirmed: number;
      cancelled: number;
      revenue: { amount: number; currency: string };
    };
    protections: {
      attach_rate_pct: number;
      total_sold: number;
      revenue: { amount: number; currency: string };
    };
    users: {
      total: number;
      active: number;
      new_this_period: number;
    };
    revenue_share: {
      earned: { amount: number; currency: string };
      paid: { amount: number; currency: string };
      pending: { amount: number; currency: string };
    };
  };
}

export default function B2BDashboardPage() {
  // TODO: Get partner_id from auth context
  const partnerId = 'demo-partner';

  const { data, isLoading } = useQuery({
    queryKey: ['b2b-dashboard', partnerId],
    queryFn: () =>
      apiClient<PartnerAnalytics>(`/b2b/dashboard?partner_id=${partnerId}`),
  });

  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' \u20BD';

  const formatLargeNumber = (amount: number) => {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'K';
    return amount.toString();
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        Загрузка аналитики...
      </div>
    );
  }

  const a = data?.analytics;
  if (!a) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        Нет данных аналитики
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Партнёрская аналитика</h1>
          <p className="text-sm text-gray-500">
            Период: последние 30 дней
          </p>
        </div>
        <a
          href="/b2b"
          className="text-sm text-primary-500 hover:underline"
        >
          &larr; Назад
        </a>
      </div>

      {/* Revenue overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Выручка от бронирований</p>
          <p className="text-2xl font-bold text-primary-600">
            {formatLargeNumber(a.bookings.revenue.amount)} &#8381;
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {a.bookings.total} бронирований
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Выручка от защит</p>
          <p className="text-2xl font-bold text-green-600">
            {formatLargeNumber(a.protections.revenue.amount)} &#8381;
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {a.protections.total_sold} проданных защит
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Ваш доход (revenue share)</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatLargeNumber(a.revenue_share.earned.amount)} &#8381;
          </p>
          <p className="text-xs text-gray-400 mt-1">
            К выплате: {formatPrice(a.revenue_share.pending.amount)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Attach rate</p>
          <p className="text-2xl font-bold text-sunset">
            {a.protections.attach_rate_pct}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            защит на бронирование
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bookings breakdown */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Бронирования</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Всего</span>
              <span className="font-semibold">{a.bookings.total.toLocaleString('ru-RU')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Подтверждённые</span>
              <span className="font-semibold text-green-600">
                {a.bookings.confirmed.toLocaleString('ru-RU')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Отменённые</span>
              <span className="font-semibold text-red-500">
                {a.bookings.cancelled.toLocaleString('ru-RU')}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-gray-600">Конверсия</span>
              <span className="font-semibold">
                {((a.bookings.confirmed / a.bookings.total) * 100).toFixed(1)}%
              </span>
            </div>

            {/* Simple bar chart */}
            <div className="mt-4">
              <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(a.bookings.confirmed / a.bookings.total) * 100}%`,
                  }}
                />
                <div
                  className="bg-red-400"
                  style={{
                    width: `${(a.bookings.cancelled / a.bookings.total) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Подтверждённые</span>
                <span>Отменённые</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Пользователи</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Всего зарегистрировано</span>
              <span className="font-semibold">{a.users.total.toLocaleString('ru-RU')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Активные (30 дней)</span>
              <span className="font-semibold text-primary-600">
                {a.users.active.toLocaleString('ru-RU')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Новые за период</span>
              <span className="font-semibold text-green-600">
                +{a.users.new_this_period.toLocaleString('ru-RU')}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-gray-600">Retention rate</span>
              <span className="font-semibold">
                {((a.users.active / a.users.total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue share details */}
      <div className="card mt-8">
        <h2 className="font-semibold text-lg mb-4">Revenue Share</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Всего заработано</p>
            <p className="text-xl font-bold">
              {formatPrice(a.revenue_share.earned.amount)}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Выплачено</p>
            <p className="text-xl font-bold text-green-600">
              {formatPrice(a.revenue_share.paid.amount)}
            </p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">К выплате</p>
            <p className="text-xl font-bold text-yellow-600">
              {formatPrice(a.revenue_share.pending.amount)}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">
          Выплаты производятся ежемесячно 15-го числа на расчётный счёт партнёра.
        </p>
      </div>
    </div>
  );
}
