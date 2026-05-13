'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HotelCard } from '@/components/HotelCard';
import { apiClient } from '@/lib/api';

interface Hotel {
  id: string;
  name: string;
  city: string;
  district: string;
  stars: number;
  price_per_night: number;
  total_price: number;
  currency: string;
  amenities: string[];
  rating: number;
  reviews_count: number;
  photos_count: number;
  available_rooms: number;
  checkin: string;
  checkout: string;
  nights: number;
}

interface HotelSearchResponse {
  hotels: Hotel[];
  metadata: {
    total: number;
    city: string;
    checkin: string;
    checkout: string;
    guests: number;
  };
}

const POPULAR_CITIES = [
  'Москва', 'Санкт-Петербург', 'Сочи', 'Казань', 'Краснодар',
  'Калининград', 'Екатеринбург', 'Новосибирск',
];

export default function HotelsPage() {
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState(2);
  const [searchParams, setSearchParams] = useState<{
    city: string;
    checkin: string;
    checkout: string;
    guests: number;
  } | null>(null);

  // Filters
  const [minStars, setMinStars] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: ['hotels', searchParams, minStars, maxPrice],
    queryFn: () => {
      if (!searchParams) return null;
      const params = new URLSearchParams({
        city: searchParams.city,
        checkin: searchParams.checkin,
        checkout: searchParams.checkout,
        guests: String(searchParams.guests),
      });
      if (minStars) params.set('min_stars', String(minStars));
      if (maxPrice) params.set('max_price', String(maxPrice));
      return apiClient<HotelSearchResponse>(`/search/hotels?${params}`);
    },
    enabled: !!searchParams,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city || !checkin || !checkout) return;
    setSearchParams({ city, checkin, checkout, guests });
  };

  const handleCityQuick = (c: string) => {
    setCity(c);
  };

  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' \u20BD';

  // Set default dates
  const today = new Date();
  const defaultCheckin = new Date(today);
  defaultCheckin.setDate(defaultCheckin.getDate() + 14);
  const defaultCheckout = new Date(defaultCheckin);
  defaultCheckout.setDate(defaultCheckout.getDate() + 3);
  const minDate = today.toISOString().split('T')[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">Поиск отелей</h1>
      <p className="text-gray-500 mb-6">
        Найдите лучшие отели в городах России
      </p>

      {/* Search form */}
      <form onSubmit={handleSearch} className="card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Город
            </label>
            <input
              className="input-field"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Москва"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заезд
            </label>
            <input
              className="input-field"
              type="date"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              min={minDate}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Выезд
            </label>
            <input
              className="input-field"
              type="date"
              value={checkout}
              onChange={(e) => setCheckout(e.target.value)}
              min={checkin || minDate}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Гости
            </label>
            <select
              className="input-field"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value, 10))}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'гость' : n < 5 ? 'гостя' : 'гостей'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick city selection */}
        <div className="flex flex-wrap gap-2 mb-4">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleCityQuick(c)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                city === c
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <button type="submit" className="btn-primary w-full md:w-auto px-8">
          Найти отели
        </button>
      </form>

      {/* Filters (shown after search) */}
      {searchParams && data && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="text-sm text-gray-500">Фильтры:</span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Звёзды от:</label>
            <select
              className="input-field py-1 px-2 text-sm w-20"
              value={minStars || ''}
              onChange={(e) =>
                setMinStars(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
            >
              <option value="">Все</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Макс. цена/ночь:</label>
            <select
              className="input-field py-1 px-2 text-sm w-32"
              value={maxPrice || ''}
              onChange={(e) =>
                setMaxPrice(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
            >
              <option value="">Любая</option>
              <option value="3000">до 3 000 &#8381;</option>
              <option value="5000">до 5 000 &#8381;</option>
              <option value="8000">до 8 000 &#8381;</option>
              <option value="15000">до 15 000 &#8381;</option>
              <option value="25000">до 25 000 &#8381;</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-20 text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          Поиск отелей...
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
            Найдено {data.metadata.total} отелей в городе {data.metadata.city}
            {' '}
            ({data.metadata.checkin} &mdash; {data.metadata.checkout})
          </p>

          {data.hotels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-700 mb-2">Отели не найдены</p>
              <p className="text-sm text-gray-500">
                Попробуйте изменить фильтры или выбрать другие даты
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.hotels.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!searchParams && !isLoading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Выберите город и даты</p>
          <p className="text-sm">для поиска доступных отелей</p>
        </div>
      )}
    </div>
  );
}
