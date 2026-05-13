'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

/** All 20 supported Russian domestic airports */
const SUPPORTED_AIRPORTS = [
  { code: 'SVO', name: 'Москва (Шереметьево)' },
  { code: 'DME', name: 'Москва (Домодедово)' },
  { code: 'VKO', name: 'Москва (Внуково)' },
  { code: 'LED', name: 'Санкт-Петербург (Пулково)' },
  { code: 'AER', name: 'Сочи (Адлер)' },
  { code: 'KRR', name: 'Краснодар (Пашковский)' },
  { code: 'SVX', name: 'Екатеринбург (Кольцово)' },
  { code: 'OVB', name: 'Новосибирск (Толмачёво)' },
  { code: 'ROV', name: 'Ростов-на-Дону (Платов)' },
  { code: 'KZN', name: 'Казань' },
  { code: 'UFA', name: 'Уфа' },
  { code: 'VOG', name: 'Волгоград' },
  { code: 'KGD', name: 'Калининград (Храброво)' },
  { code: 'MRV', name: 'Минеральные Воды' },
  { code: 'AAQ', name: 'Анапа (Витязево)' },
  { code: 'IKT', name: 'Иркутск' },
  { code: 'KHV', name: 'Хабаровск' },
  { code: 'VVO', name: 'Владивосток' },
  { code: 'TJM', name: 'Тюмень (Рощино)' },
  { code: 'CEK', name: 'Челябинск (Баландино)' },
];

interface PriceAlert {
  id: string;
  origin: string;
  destination: string;
  departure_date: string;
  target_price: number;
  current_price: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'EXPIRED';
  created_at: string;
}

interface AlertsResponse {
  alerts: PriceAlert[];
}

interface CreateAlertPayload {
  origin: string;
  destination: string;
  departure_date: string;
  target_price: number;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активно',
  TRIGGERED: 'Сработало',
  EXPIRED: 'Истекло',
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  TRIGGERED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
};

function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export default function AlertsPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiClient<AlertsResponse>('/api/user/alerts'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAlertPayload) =>
      apiClient<{ alert: PriceAlert }>('/api/user/alerts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setShowForm(false);
      resetForm();
    },
    onError: (err: Error) => {
      setError(err.message || 'Не удалось создать уведомление');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiClient(`/api/user/alerts/${alertId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  function resetForm() {
    setOrigin('');
    setDestination('');
    setDepartureDate('');
    setTargetPrice('');
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!origin || !destination || !departureDate || !targetPrice) {
      setError('Заполните все поля');
      return;
    }

    if (origin === destination) {
      setError('Город вылета и прилёта должны отличаться');
      return;
    }

    const price = Number(targetPrice);
    if (price <= 0 || isNaN(price)) {
      setError('Цена должна быть положительным числом');
      return;
    }

    createMutation.mutate({
      origin,
      destination,
      departure_date: departureDate,
      target_price: price,
    });
  }

  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' \u20BD';

  const alerts = data?.alerts || [];
  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">
          Ценовые уведомления
          {activeCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({activeCount}/10 активных)
            </span>
          )}
        </h2>
        {!showForm && activeCount < 10 && (
          <button
            className="btn-primary text-sm"
            onClick={() => setShowForm(true)}
          >
            + Создать
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Откуда
              </label>
              <select
                className="input-field w-full"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                <option value="">Выберите аэропорт</option>
                {SUPPORTED_AIRPORTS.map((ap) => (
                  <option key={ap.code} value={ap.code}>
                    {ap.code} - {ap.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Куда
              </label>
              <select
                className="input-field w-full"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="">Выберите аэропорт</option>
                {SUPPORTED_AIRPORTS.filter((ap) => ap.code !== origin).map(
                  (ap) => (
                    <option key={ap.code} value={ap.code}>
                      {ap.code} - {ap.name}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата вылета
              </label>
              <input
                type="date"
                className="input-field w-full"
                value={departureDate}
                min={getMinDate()}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Целевая цена (RUB)
              </label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="9000"
                min="1"
                step="100"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary text-sm"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать уведомление'}
            </button>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Alerts list */}
      {isLoading ? (
        <div className="text-center text-gray-500 py-4">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
          Загрузка...
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-gray-500 text-sm">
          Нет уведомлений. Создайте первое, чтобы отслеживать снижение цен.
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">
                      {alert.origin} &rarr; {alert.destination}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[alert.status] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUS_LABELS[alert.status] || alert.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Вылет: {new Date(alert.departure_date).toLocaleDateString('ru-RU')}
                  </p>
                  <div className="flex gap-4 text-sm mt-1">
                    <span className="text-gray-500">
                      Целевая: {formatPrice(alert.target_price)}
                    </span>
                    {alert.current_price > 0 && (
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
                {alert.status === 'ACTIVE' && (
                  <button
                    className="text-sm text-red-500 hover:text-red-700 ml-4"
                    onClick={() => deleteMutation.mutate(alert.id)}
                    disabled={deleteMutation.isPending}
                    title="Удалить уведомление"
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
