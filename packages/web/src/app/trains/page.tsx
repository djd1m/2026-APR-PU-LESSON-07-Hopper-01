'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrainCard } from '@/components/TrainCard';
import { apiClient } from '@/lib/api';

interface TrainClass {
  code: string;
  name: string;
  price: number;
  currency: string;
  available_seats: number;
}

interface Train {
  id: string;
  train_number: string;
  train_name: string;
  train_type: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration_min: number;
  classes: TrainClass[];
  distance_km: number;
}

interface TrainSearchResponse {
  trains: Train[];
  metadata: {
    total: number;
    origin: string;
    destination: string;
    date: string;
  };
}

const POPULAR_ROUTES = [
  { origin: 'Москва', destination: 'Санкт-Петербург' },
  { origin: 'Москва', destination: 'Нижний Новгород' },
  { origin: 'Москва', destination: 'Казань' },
  { origin: 'Санкт-Петербург', destination: 'Москва' },
  { origin: 'Москва', destination: 'Сочи' },
];

export default function TrainsPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [searchParams, setSearchParams] = useState<{
    origin: string;
    destination: string;
    date: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['trains', searchParams],
    queryFn: () => {
      if (!searchParams) return null;
      const params = new URLSearchParams({
        origin: searchParams.origin,
        destination: searchParams.destination,
        date: searchParams.date,
      });
      return apiClient<TrainSearchResponse>(`/search/trains?${params}`);
    },
    enabled: !!searchParams,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !date) return;
    setSearchParams({ origin, destination, date });
  };

  const handleQuickRoute = (route: { origin: string; destination: string }) => {
    setOrigin(route.origin);
    setDestination(route.destination);
  };

  const swapRoutes = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">Поиск ЖД-билетов</h1>
      <p className="text-gray-500 mb-6">
        Сапсан, Ласточка, фирменные и пассажирские поезда по России
      </p>

      {/* Search form */}
      <form onSubmit={handleSearch} className="card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Откуда
            </label>
            <input
              className="input-field"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Москва"
              required
            />
          </div>

          <div className="flex items-end justify-center">
            <button
              type="button"
              onClick={swapRoutes}
              className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Поменять местами"
            >
              &#8596;
            </button>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Куда
            </label>
            <input
              className="input-field"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Санкт-Петербург"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата
            </label>
            <input
              className="input-field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              required
            />
          </div>
        </div>

        {/* Popular routes */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-gray-500">Популярные:</span>
          {POPULAR_ROUTES.map((route, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleQuickRoute(route)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                origin === route.origin && destination === route.destination
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {route.origin} &rarr; {route.destination}
            </button>
          ))}
        </div>

        <button type="submit" className="btn-primary w-full md:w-auto px-8">
          Найти поезда
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-20 text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          Поиск поездов...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12 text-red-500">
          Ошибка при поиске. Попробуйте позже.
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Найдено {data.metadata.total} поездов{' '}
            {data.metadata.origin} &rarr; {data.metadata.destination}
            {' '}
            на {new Date(data.metadata.date).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          {data.trains.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-700 mb-2">Поезда не найдены</p>
              <p className="text-sm text-gray-500">
                Попробуйте другую дату или маршрут. На данный момент поддерживаются
                маршруты из Москвы и Санкт-Петербурга.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.trains.map((train) => (
                <TrainCard key={train.id} train={train} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!searchParams && !isLoading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Выберите маршрут и дату</p>
          <p className="text-sm">
            для поиска доступных поездов РЖД
          </p>
        </div>
      )}
    </div>
  );
}
