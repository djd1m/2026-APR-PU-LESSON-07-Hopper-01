'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SearchForm } from '@/components/SearchForm';
import { FlightCard } from '@/components/FlightCard';
import { PriceCalendar } from '@/components/PriceCalendar';
import { apiClient } from '@/lib/api';

type SortOption = 'price' | 'duration' | 'departure';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';
  const passengers = parseInt(searchParams.get('passengers') || '1', 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['flights', origin, destination, date, passengers],
    queryFn: () =>
      apiClient<{
        flights: Flight[];
        calendar_prices?: Record<string, number>;
      }>(`/flights/search?origin=${origin}&destination=${destination}&departure_date=${date}&passengers=${passengers}`),
    enabled: !!(origin && destination),
  });

  // TODO: Implement client-side sort/filter state
  const sortBy: SortOption = 'price';
  const stopsFilter: number | null = null;

  const flights = data?.flights || [];

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

  const filteredFlights = stopsFilter !== null
    ? sortedFlights.filter((f) => f.stops <= stopsFilter)
    : sortedFlights;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search form (compact) */}
      <div className="mb-8">
        <SearchForm compact defaultValues={{ origin, destination, date, passengers }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Price Calendar + Filters */}
        <aside className="lg:col-span-1 space-y-6">
          {data?.calendar_prices && (
            <div className="card">
              <h3 className="font-semibold mb-3">Календарь цен</h3>
              <PriceCalendar
                prices={data.calendar_prices}
                selectedDate={date}
                origin={origin}
                destination={destination}
              />
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold mb-3">Фильтры</h3>
            {/* TODO: Stops filter, airline filter, time range filter */}
            <div className="space-y-2 text-sm text-gray-500">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                Только прямые
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                До 1 пересадки
              </label>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Сортировка</h3>
            <div className="space-y-2 text-sm">
              {/* TODO: Wire up sort state */}
              <button className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 font-medium text-primary-500">
                По цене
              </button>
              <button className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 text-gray-600">
                По длительности
              </button>
              <button className="block w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 text-gray-600">
                По времени вылета
              </button>
            </div>
          </div>
        </aside>

        {/* Main: Flight results */}
        <section className="lg:col-span-3">
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

          {!isLoading && !error && filteredFlights.length === 0 && origin && (
            <div className="card text-center py-10 text-gray-500">
              Рейсы не найдены. Попробуйте другие даты или направления.
            </div>
          )}

          {!isLoading && !origin && (
            <div className="card text-center py-10 text-gray-500">
              Введите маршрут для поиска рейсов.
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

interface Flight {
  id: string;
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration_min: number;
  stops: number;
  price: number;
  prediction?: {
    recommendation: 'BUY_NOW' | 'WAIT' | 'NO_DATA';
    confidence: number;
  };
}
