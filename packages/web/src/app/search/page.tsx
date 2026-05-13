'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SearchForm } from '@/components/SearchForm';
import { FlightCard } from '@/components/FlightCard';
import { PriceCalendar } from '@/components/PriceCalendar';
import { apiClient } from '@/lib/api';

type SortOption = 'price' | 'duration' | 'departure';

interface Flight {
  id: string;
  airline: string;
  airline_name: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration_min: number;
  stops: number;
  price: number;
  currency: string;
  available_seats: number;
  cabin_class: string;
  prediction?: {
    recommendation: 'BUY_NOW' | 'WAIT' | 'NO_DATA';
    confidence: number;
  };
}

interface SearchResponse {
  flights: Flight[];
  metadata: {
    total: number;
    cached: boolean;
    search_time_ms: number;
  };
}

interface CalendarDay {
  date: string;
  min_price: number;
  tier: 'green' | 'yellow' | 'red';
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';
  const passengers = parseInt(searchParams.get('passengers') || '1', 10);

  const [sortBy, setSortBy] = useState<SortOption>('price');
  const [stopsFilter, setStopsFilter] = useState<number | null>(null);

  const hasSearchParams = !!(origin && destination && date);

  // Fetch flights
  const { data, isLoading, error } = useQuery({
    queryKey: ['flights', origin, destination, date, passengers],
    queryFn: () =>
      apiClient<SearchResponse>(
        `/search/flights?origin=${origin}&destination=${destination}&departure_date=${date}&passengers=${passengers}`
      ),
    enabled: hasSearchParams,
  });

  // Fetch calendar data for the month
  const calendarMonth = date ? date.substring(0, 7) : '';
  const { data: calendarData } = useQuery({
    queryKey: ['calendar', origin, destination, calendarMonth],
    queryFn: () =>
      apiClient<{ dates: CalendarDay[] }>(
        `/search/calendar?origin=${origin}&destination=${destination}&month=${calendarMonth}`
      ),
    enabled: !!(origin && destination && calendarMonth),
  });

  const flights = data?.flights || [];

  // Apply sort
  const sortedFlights = [...flights].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'duration':
        return a.duration_min - b.duration_min;
      case 'departure':
        return new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime();
      default:
        return 0;
    }
  });

  // Apply stops filter
  const filteredFlights =
    stopsFilter !== null
      ? sortedFlights.filter((f) => f.stops <= stopsFilter)
      : sortedFlights;

  // Convert calendar data to Record for PriceCalendar component
  const calendarPrices: Record<string, number> = {};
  if (calendarData?.dates) {
    for (const day of calendarData.dates) {
      calendarPrices[day.date] = day.min_price;
    }
  }

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'price', label: 'По цене' },
    { key: 'duration', label: 'По длительности' },
    { key: 'departure', label: 'По времени вылета' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search form (compact) */}
      <div className="mb-8">
        <SearchForm compact defaultValues={{ origin, destination, date, passengers }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Price Calendar + Filters */}
        <aside className="lg:col-span-1 space-y-6">
          {Object.keys(calendarPrices).length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">Календарь цен</h3>
              <PriceCalendar
                prices={calendarPrices}
                selectedDate={date}
                origin={origin}
                destination={destination}
              />
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold mb-3">Фильтры</h3>
            <div className="space-y-2 text-sm text-gray-500">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="stops"
                  className="rounded"
                  checked={stopsFilter === null}
                  onChange={() => setStopsFilter(null)}
                />
                Любые пересадки
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="stops"
                  className="rounded"
                  checked={stopsFilter === 0}
                  onChange={() => setStopsFilter(0)}
                />
                Только прямые
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="stops"
                  className="rounded"
                  checked={stopsFilter === 1}
                  onChange={() => setStopsFilter(1)}
                />
                До 1 пересадки
              </label>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Сортировка</h3>
            <div className="space-y-2 text-sm">
              {sortOptions.map((opt) => (
                <button
                  key={opt.key}
                  className={`block w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 ${
                    sortBy === opt.key
                      ? 'font-medium text-primary-500'
                      : 'text-gray-600'
                  }`}
                  onClick={() => setSortBy(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main: Flight results */}
        <section className="lg:col-span-3">
          {/* Search metadata */}
          {data?.metadata && !isLoading && (
            <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
              <span>
                Найдено {filteredFlights.length} рейс{filteredFlights.length === 1 ? '' : filteredFlights.length < 5 ? 'а' : 'ов'}
                {data.metadata.cached && ' (из кеша)'}
              </span>
              <span>Поиск за {data.metadata.search_time_ms} мс</span>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-20 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
              Ищем лучшие рейсы...
            </div>
          )}

          {error && (
            <div className="card text-center py-10 text-red-500">
              Ошибка при поиске. Попробуйте снова.
            </div>
          )}

          {!isLoading && !error && filteredFlights.length === 0 && hasSearchParams && (
            <div className="card text-center py-10 text-gray-500">
              Рейсы не найдены. Попробуйте другие даты или направления.
            </div>
          )}

          {!isLoading && !hasSearchParams && (
            <div className="card text-center py-10 text-gray-500">
              Введите маршрут и дату для поиска рейсов.
            </div>
          )}

          <div className="space-y-4">
            {filteredFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
