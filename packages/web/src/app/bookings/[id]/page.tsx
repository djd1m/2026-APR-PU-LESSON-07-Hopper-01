'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

function formatPrice(amount: number | { amount: number } | any) {
  const num = typeof amount === 'object' ? amount?.amount || 0 : amount || 0;
  return num.toLocaleString('ru-RU') + ' ₽';
}

function formatDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const STATUS: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Подтверждено', color: 'bg-green-100 text-green-800' },
  pending: { label: 'Ожидает оплаты', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'Отменено', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Завершено', color: 'bg-gray-100 text-gray-800' },
};

const PROTECTION_NAMES: Record<string, string> = {
  CANCEL_FOR_ANY_REASON: 'Отмена по любой причине',
  PRICE_DROP: 'Защита от падения цены',
  FLIGHT_DISRUPTION: 'Гарантия при задержке',
};

function BookingDetailContent() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => apiClient<any>(`/bookings/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        Загрузка бронирования...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-red-500 text-lg mb-4">Бронирование не найдено</p>
        <a href="/bookings" className="text-blue-600 underline">Назад к бронированиям</a>
      </div>
    );
  }

  const booking = data.booking || data;
  const status = STATUS[booking.status] || { label: booking.status, color: 'bg-gray-100' };
  const flight = booking.flights?.[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <a href="/bookings" className="text-blue-600 text-sm mb-4 inline-block">&larr; Все бронирования</a>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">Бронирование</h1>
            <p className="text-gray-500 text-sm mt-1">Создано: {formatDate(booking.created_at)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* PNR */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-center">
          <p className="text-sm text-blue-600 mb-1">Код бронирования (PNR)</p>
          <p className="text-3xl font-mono font-bold text-blue-800 tracking-wider">{booking.pnr}</p>
        </div>

        {/* Payment pending */}
        {booking.status === 'pending' && booking.payment_url && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-yellow-800 font-medium mb-2">Ожидает оплаты</p>
            <a
              href={booking.payment_url}
              className="inline-block bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-yellow-600"
            >
              Оплатить сейчас
            </a>
          </div>
        )}

        {booking.status === 'pending' && !booking.payment_url && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-yellow-800">Ожидает подтверждения оплаты от YooKassa</p>
          </div>
        )}

        {/* Flight info */}
        {flight && (
          <div className="border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">Рейс</h2>
            <p className="text-lg font-medium">{flight.airline} {flight.flight_number}</p>
            {flight.departure_at && (
              <p className="text-gray-600 text-sm">{formatDate(flight.departure_at)}</p>
            )}
          </div>
        )}

        {/* Price */}
        <div className="border rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-2">Стоимость</h2>
          <div className="flex justify-between text-lg">
            <span>Итого</span>
            <span className="font-bold">{formatPrice(booking.total_price)}</span>
          </div>
        </div>

        {/* Passengers */}
        {booking.passengers && booking.passengers.length > 0 && (
          <div className="border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">Пассажиры</h2>
            {booking.passengers.map((p: any, i: number) => (
              <p key={i} className="text-gray-700">{p.first_name} {p.last_name}</p>
            ))}
          </div>
        )}

        {/* Protections */}
        {booking.protections && booking.protections.length > 0 && (
          <div className="border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">Защита</h2>
            {booking.protections.map((p: any, i: number) => (
              <div key={i} className="flex justify-between py-1">
                <span>{PROTECTION_NAMES[p.type] || p.type}</span>
                <span className="text-sm text-green-600">{p.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Demo warning */}
        <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded mt-4">
          ⚠️ Это демо-бронирование. PNR существует только в нашей системе.
          Для реального бронирования необходимо подключение GDS (Nemo.travel / Amadeus).
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <AuthGuard>
      <BookingDetailContent />
    </AuthGuard>
  );
}
