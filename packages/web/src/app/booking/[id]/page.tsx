'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { PredictionBadge } from '@/components/PredictionBadge';
import { ProtectionCheckbox } from '@/components/ProtectionCheckbox';
import { apiClient } from '@/lib/api';

interface BookingFlight {
  id: string;
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration_min: number;
  price: number;
  prediction?: {
    recommendation: 'BUY_NOW' | 'WAIT' | 'NO_DATA';
    confidence: number;
  };
}

interface PassengerForm {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  passport_number: string;
  citizenship: string;
}

const EMPTY_PASSENGER: PassengerForm = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  passport_number: '',
  citizenship: 'RU',
};

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();

  const [passengers, setPassengers] = useState<PassengerForm[]>([{ ...EMPTY_PASSENGER }]);
  const [selectedProtections, setSelectedProtections] = useState<string[]>([]);

  const { data: flight, isLoading } = useQuery({
    queryKey: ['flight', id],
    queryFn: () => apiClient<BookingFlight>(`/flights/${id}`),
    enabled: !!id,
  });

  const bookMutation = useMutation({
    mutationFn: (payload: {
      flight_id: string;
      passengers: PassengerForm[];
      protections: string[];
    }) =>
      apiClient('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: { payment_url?: string; id?: string }) => {
      // TODO: Redirect to payment gateway (YooKassa)
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    },
  });

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const toggleProtection = (type: string) => {
    setSelectedProtections((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flight) return;

    bookMutation.mutate({
      flight_id: flight.id,
      passengers,
      protections: selectedProtections,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        Загрузка...
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Рейс не найден.
      </div>
    );
  }

  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' ₽';

  const protectionCosts = {
    PRICE_FREEZE: 2500,
    CANCEL_FOR_ANY_REASON: Math.round(flight.price * 0.05),
    PRICE_DROP: Math.round(flight.price * 0.03),
  };

  const totalProtectionCost = selectedProtections.reduce(
    (sum, type) => sum + (protectionCosts[type as keyof typeof protectionCosts] || 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8">Бронирование</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Flight info */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Информация о рейсе</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium">
                {flight.airline} {flight.flight_number}
              </p>
              <p className="text-gray-600">
                {flight.origin} &rarr; {flight.destination}
              </p>
              <p className="text-gray-500 text-sm">
                {new Date(flight.departure_at).toLocaleString('ru-RU')} &mdash;{' '}
                {new Date(flight.arrival_at).toLocaleString('ru-RU')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-500">{formatPrice(flight.price)}</p>
              {flight.prediction && (
                <PredictionBadge
                  recommendation={flight.prediction.recommendation}
                  confidence={flight.prediction.confidence}
                />
              )}
            </div>
          </div>
        </div>

        {/* Passengers */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Пассажиры</h2>
          {passengers.map((p, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                <input
                  className="input-field"
                  value={p.first_name}
                  onChange={(e) => updatePassenger(i, 'first_name', e.target.value)}
                  placeholder="Иван"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                <input
                  className="input-field"
                  value={p.last_name}
                  onChange={(e) => updatePassenger(i, 'last_name', e.target.value)}
                  placeholder="Иванов"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
                <input
                  className="input-field"
                  type="date"
                  value={p.date_of_birth}
                  onChange={(e) => updatePassenger(i, 'date_of_birth', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Номер паспорта</label>
                <input
                  className="input-field"
                  value={p.passport_number}
                  onChange={(e) => updatePassenger(i, 'passport_number', e.target.value)}
                  placeholder="1234 567890"
                  required
                />
              </div>
            </div>
          ))}
        </div>

        {/* Protection options */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Защита покупки</h2>
          <div className="space-y-3">
            <ProtectionCheckbox
              type="PRICE_FREEZE"
              title="Заморозка цены"
              description="Зафиксируйте текущую цену на 21 день. Если передумаете — ничего не теряете кроме комиссии."
              price={protectionCosts.PRICE_FREEZE}
              checked={selectedProtections.includes('PRICE_FREEZE')}
              onChange={() => toggleProtection('PRICE_FREEZE')}
            />
            <ProtectionCheckbox
              type="CANCEL_FOR_ANY_REASON"
              title="Отмена по любой причине"
              description="Верните до 80% стоимости билета при отмене по любой причине до вылета."
              price={protectionCosts.CANCEL_FOR_ANY_REASON}
              checked={selectedProtections.includes('CANCEL_FOR_ANY_REASON')}
              onChange={() => toggleProtection('CANCEL_FOR_ANY_REASON')}
            />
            <ProtectionCheckbox
              type="PRICE_DROP"
              title="Защита от падения цены"
              description="Если цена снизится в течение 10 дней после покупки — вернём разницу."
              price={protectionCosts.PRICE_DROP}
              checked={selectedProtections.includes('PRICE_DROP')}
              onChange={() => toggleProtection('PRICE_DROP')}
            />
          </div>
        </div>

        {/* Total & Payment */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">Рейс</span>
            <span>{formatPrice(flight.price)}</span>
          </div>
          {totalProtectionCost > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Защита</span>
              <span>{formatPrice(totalProtectionCost)}</span>
            </div>
          )}
          <div className="border-t pt-4 flex items-center justify-between">
            <span className="text-lg font-bold">Итого</span>
            <span className="text-2xl font-bold text-primary-500">
              {formatPrice(flight.price + totalProtectionCost)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={bookMutation.isPending}
          className="btn-primary w-full text-center text-lg py-4"
        >
          {bookMutation.isPending ? 'Оформление...' : 'Оплатить'}
        </button>

        {bookMutation.isError && (
          <p className="text-red-500 text-center">
            Ошибка при оформлении. Попробуйте снова.
          </p>
        )}
      </form>
    </div>
  );
}
