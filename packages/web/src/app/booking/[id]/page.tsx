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
  nationality: string;
}

interface BookingResponse {
  booking: {
    id: string;
    status: string;
    pnr: string;
    total_price: { amount: number; currency: string };
    breakdown: {
      flight: { amount: number; currency: string };
      protections: { amount: number; currency: string };
    };
    flights: Array<{
      airline: string;
      flight_number: string;
      origin: string;
      destination: string;
      departure_at: string;
    }>;
    protections: Array<{
      type: string;
      status: string;
      premium: { amount: number; currency: string };
      coverage: { amount: number; currency: string };
    }>;
    confirmed_at: string | null;
  };
}

const EMPTY_PASSENGER: PassengerForm = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  passport_number: '',
  nationality: 'RU',
};

const PAYMENT_METHODS = [
  { value: 'mir', label: 'Карта МИР', icon: '💳' },
  { value: 'sbp', label: 'СБП (QR)', icon: '📱' },
  { value: 'telegram', label: 'Telegram Payments', icon: '✈' },
] as const;

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();

  const [passengers, setPassengers] = useState<PassengerForm[]>([{ ...EMPTY_PASSENGER }]);
  const [selectedProtections, setSelectedProtections] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('sbp');
  const [bookingResult, setBookingResult] = useState<BookingResponse | null>(null);

  const { data: flight, isLoading } = useQuery({
    queryKey: ['flight', id],
    queryFn: () => apiClient<BookingFlight>(`/search/flights/${id}`),
    enabled: !!id,
  });

  const bookMutation = useMutation({
    mutationFn: (payload: {
      flight_id: string;
      passengers: PassengerForm[];
      protections: Array<{ type: string }>;
      payment_method: string;
    }) =>
      apiClient<BookingResponse>('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: BookingResponse) => {
      setBookingResult(data);
    },
  });

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addPassenger = () => {
    setPassengers((prev) => [...prev, { ...EMPTY_PASSENGER }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleProtection = (type: string) => {
    setSelectedProtections((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const validatePassport = (value: string): boolean => {
    return /^\d{10}$/.test(value.replace(/\s/g, ''));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flight) return;

    // Validate passports
    for (const p of passengers) {
      const cleanPassport = p.passport_number.replace(/\s/g, '');
      if (!validatePassport(cleanPassport)) {
        alert('Номер паспорта должен содержать 10 цифр');
        return;
      }
    }

    bookMutation.mutate({
      flight_id: flight.id,
      passengers: passengers.map((p) => ({
        ...p,
        passport_number: p.passport_number.replace(/\s/g, ''),
      })),
      protections: selectedProtections.map((type) => ({ type })),
      payment_method: paymentMethod,
    });
  };

  // Success screen: show PNR + confirmation
  if (bookingResult) {
    const b = bookingResult.booking;
    const flightInfo = b.flights[0];

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Бронирование подтверждено!</h1>

          <div className="bg-gray-50 rounded-lg p-6 my-6">
            <p className="text-sm text-gray-500 mb-1">Код бронирования (PNR)</p>
            <p className="text-4xl font-mono font-bold tracking-widest text-primary-500">
              {b.pnr}
            </p>
          </div>

          {flightInfo && (
            <div className="mb-6">
              <p className="text-lg font-medium">
                {flightInfo.airline} {flightInfo.flight_number}
              </p>
              <p className="text-gray-600">
                {flightInfo.origin} &rarr; {flightInfo.destination}
              </p>
              <p className="text-gray-500 text-sm">
                {new Date(flightInfo.departure_at).toLocaleString('ru-RU')}
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Перелёт</span>
              <span>{b.breakdown.flight.amount.toLocaleString('ru-RU')} &#8381;</span>
            </div>
            {b.breakdown.protections.amount > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Защита</span>
                <span>{b.breakdown.protections.amount.toLocaleString('ru-RU')} &#8381;</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Итого</span>
              <span className="text-primary-500">
                {b.total_price.amount.toLocaleString('ru-RU')} &#8381;
              </span>
            </div>
          </div>

          {b.protections.length > 0 && (
            <div className="mt-6 text-left">
              <h3 className="font-semibold mb-2">Активные защиты</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                {b.protections.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {p.type === 'CANCEL_FOR_ANY_REASON'
                        ? 'Отмена по любой причине'
                        : p.type === 'PRICE_DROP'
                        ? 'Защита от падения цены'
                        : p.type}
                    </span>
                    <span className="text-green-600">Активна</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-6">
            Подтверждение отправлено в Telegram и на email.
          </p>

          <a href="/bookings" className="btn-primary inline-block mt-4 px-8">
            Мои бронирования
          </a>
        </div>
      </div>
    );
  }

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
    amount.toLocaleString('ru-RU') + ' \u20BD';

  const protectionCosts: Record<string, number> = {
    PRICE_FREEZE: 2500,
    cancel_for_any_reason: Math.max(1500, Math.min(5000, Math.round(flight.price * 0.12))),
    price_drop: 1500,
  };

  const totalProtectionCost = selectedProtections.reduce(
    (sum, type) => sum + (protectionCosts[type] || 0),
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Пассажиры</h2>
            <button
              type="button"
              onClick={addPassenger}
              className="text-sm text-primary-500 hover:underline"
            >
              + Добавить пассажира
            </button>
          </div>
          {passengers.map((p, i) => (
            <div key={i} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">
                  Пассажир {i + 1}
                </span>
                {passengers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePassenger(i)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Удалить
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер паспорта (10 цифр)
                  </label>
                  <input
                    className="input-field"
                    value={p.passport_number}
                    onChange={(e) => updatePassenger(i, 'passport_number', e.target.value)}
                    placeholder="1234567890"
                    pattern="\d{4}\s?\d{6}|\d{10}"
                    title="10 цифр номера паспорта"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Гражданство
                  </label>
                  <select
                    className="input-field"
                    value={p.nationality}
                    onChange={(e) => updatePassenger(i, 'nationality', e.target.value)}
                  >
                    <option value="RU">Россия</option>
                    <option value="BY">Беларусь</option>
                    <option value="KZ">Казахстан</option>
                    <option value="UZ">Узбекистан</option>
                    <option value="KG">Кыргызстан</option>
                    <option value="AM">Армения</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment method */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Способ оплаты</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <label
                key={pm.value}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === pm.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={pm.value}
                  checked={paymentMethod === pm.value}
                  onChange={() => setPaymentMethod(pm.value)}
                  className="sr-only"
                />
                <span className="text-xl">{pm.icon}</span>
                <span className="font-medium">{pm.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Protection options */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Защита покупки</h2>
          <div className="space-y-3">
            <ProtectionCheckbox
              type="cancel_for_any_reason"
              title="Отмена по любой причине"
              description="Полный возврат стоимости билета при отмене по любой причине до вылета. Возврат в течение 5 рабочих дней."
              price={protectionCosts.cancel_for_any_reason}
              checked={selectedProtections.includes('cancel_for_any_reason')}
              onChange={() => toggleProtection('cancel_for_any_reason')}
            />
            <ProtectionCheckbox
              type="price_drop"
              title="Защита от падения цены"
              description="Мониторинг цены 10 дней после покупки. Если цена снизится -- вернём разницу (до 50% стоимости)."
              price={protectionCosts.price_drop}
              checked={selectedProtections.includes('price_drop')}
              onChange={() => toggleProtection('price_drop')}
            />
          </div>
          {selectedProtections.length === 0 && (
            <p className="text-sm text-amber-600 mt-3">
              Без защиты вы рискуете потерять {formatPrice(flight.price)} при отмене.
            </p>
          )}
        </div>

        {/* Total & Submit */}
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
            {(bookMutation.error as Error)?.message ||
              'Ошибка при оформлении. Попробуйте снова.'}
          </p>
        )}
      </form>
    </div>
  );
}
