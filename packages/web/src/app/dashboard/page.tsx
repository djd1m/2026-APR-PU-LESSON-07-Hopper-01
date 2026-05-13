'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

interface DashboardData {
  bookings: {
    id: string;
    origin: string;
    destination: string;
    departure_at: string;
    status: string;
    total_price: number;
  }[];
  total_savings: number;
  alerts: {
    id: string;
    origin: string;
    destination: string;
    target_price: number;
    current_price: number;
  }[];
  referral_code: string;
  referral_count: number;
}

function DashboardContent() {
  const userId = 'current';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => apiClient<DashboardData>(`/users/${userId}/dashboard`),
  });

  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' ₽';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        Загрузка...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Личный кабинет</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Общая экономия</p>
          <p className="text-3xl font-bold text-prediction-buy">
            {formatPrice(data?.total_savings || 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Активные бронирования</p>
          <p className="text-3xl font-bold text-primary-500">
            {data?.bookings?.filter((b) => ['CONFIRMED', 'TICKETED'].includes(b.status)).length || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Ценовые уведомления</p>
          <p className="text-3xl font-bold text-sunset">
            {data?.alerts?.length || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bookings */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Мои бронирования</h2>
          {(!data?.bookings || data.bookings.length === 0) ? (
            <p className="text-gray-500 text-sm">Нет бронирований</p>
          ) : (
            <div className="space-y-4">
              {data.bookings.map((booking) => (
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
                        {new Date(booking.departure_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(booking.total_price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {translateStatus(booking.status)}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Ценовые уведомления</h2>
          {(!data?.alerts || data.alerts.length === 0) ? (
            <p className="text-gray-500 text-sm">Нет активных уведомлений</p>
          ) : (
            <div className="space-y-4">
              {data.alerts.map((alert) => (
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
                    <span className={alert.current_price <= alert.target_price ? 'text-prediction-buy font-medium' : 'text-gray-600'}>
                      Текущая: {formatPrice(alert.current_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Referral */}
      <div className="card mt-8">
        <h2 className="font-semibold text-lg mb-4">Реферальная программа</h2>
        <p className="text-gray-600 mb-3">
          Приглашайте друзей и получайте бонусы на следующие покупки.
        </p>
        <div className="flex items-center gap-4">
          <input
            className="input-field flex-1"
            readOnly
            value={data?.referral_code ? `https://hopperru.ru/ref/${data.referral_code}` : 'Загрузка...'}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            className="btn-primary whitespace-nowrap"
            onClick={() => {
              if (data?.referral_code) {
                navigator.clipboard.writeText(`https://hopperru.ru/ref/${data.referral_code}`);
              }
            }}
          >
            Копировать
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Приглашено друзей: {data?.referral_count || 0}
        </p>
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

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
