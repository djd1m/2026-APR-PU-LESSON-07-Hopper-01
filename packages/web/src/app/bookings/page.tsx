'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

interface Booking {
  id: string;
  status: string;
  pnr: string;
  total_price: { amount: number; currency: string };
  flights: {
    airline: string;
    flight_number: string;
    origin: string;
    destination: string;
    departure_at: string;
    price: { amount: number; currency: string };
  }[];
  passengers: { first_name: string; last_name: string }[];
  protections: { type: string; status: string; premium: number }[];
  created_at: string;
}

function formatPrice(amount: number) {
  return amount.toLocaleString('ru-RU') + ' ₽';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
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

function BookingsContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => apiClient<{ bookings: Booking[] }>('/bookings').catch(() => ({ bookings: [] })),
  });

  const bookings = Array.isArray(data) ? data : (data?.bookings || []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        Загрузка бронирований...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Мои бронирования</h1>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center">
          <p className="text-gray-500 text-lg mb-4">У вас пока нет бронирований</p>
          <a href="/search" className="btn-primary inline-block">Найти рейс</a>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: Booking) => {
            const status = STATUS_MAP[b.status] || { label: b.status, color: 'bg-gray-100' };
            const flight = b.flights?.[0];
            return (
              <a key={b.id} href={`/bookings/${b.id}`} className="block bg-white rounded-xl shadow p-6 hover:shadow-lg hover:border-blue-300 border border-transparent transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="ml-3 text-sm text-gray-500">PNR: <strong>{b.pnr}</strong></span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatPrice(b.total_price?.amount || 0)}</div>
                    <div className="text-xs text-gray-400">{formatDate(b.created_at)}</div>
                  </div>
                </div>

                {flight && (
                  <div className="flex items-center gap-4 mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium">{flight.airline} {flight.flight_number}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{flight.origin}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-bold">{flight.destination}</span>
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(flight.departure_at)}</div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">
                    Пассажиры: {b.passengers?.map(p => `${p.first_name} ${p.last_name}`).join(', ') || '—'}
                  </span>
                </div>

                {b.protections && b.protections.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {b.protections.map((p, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {PROTECTION_NAMES[p.type] || p.type}
                      </span>
                    ))}
                  </div>
                )}

                {b.status === 'pending' && (
                  <div className="mt-3 text-sm text-yellow-700 bg-yellow-50 p-2 rounded font-medium">
                    ⏳ Нажмите чтобы перейти к оплате
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <AuthGuard>
      <BookingsContent />
    </AuthGuard>
  );
}
