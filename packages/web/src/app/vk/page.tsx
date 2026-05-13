'use client';

import { useState } from 'react';
import { useVKBridge } from '@/hooks/useVKBridge';
import { VKShareButton } from '@/components/VKShareButton';
import { SearchForm } from '@/components/SearchForm';
import { FlightCard } from '@/components/FlightCard';
import { apiClient } from '@/lib/api';

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
  price: number;
  currency: string;
  stops: number;
}

/**
 * VK Mini App entry point.
 * Uses VK Bridge SDK for authentication, social sharing, and notifications.
 * Designed for 100M+ Russian VK users as an alternative distribution channel.
 */
export default function VKMiniAppPage() {
  const { isVK, user, isReady, allowNotifications } = useVKBridge();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (origin: string, destination: string, date: string) => {
    setIsLoading(true);
    setError(null);
    setSearched(true);

    try {
      const query = new URLSearchParams({
        origin,
        destination,
        departure_date: date,
        passengers: '1',
      });
      const data = await apiClient<{ flights: Flight[] }>(`/search/flights?${query}`);
      setFlights(data.flights || []);
    } catch {
      setError('Не удалось найти рейсы. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    const allowed = await allowNotifications();
    setNotificationsEnabled(allowed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">HopperRU</h1>
            <p className="text-xs text-gray-500">
              AI-предиктор цен на авиабилеты
              {isVK && isReady && ' | VK Mini App'}
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              {user.photo_100 && (
                <img
                  src={user.photo_100}
                  alt={user.first_name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-700">
                {user.first_name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="font-semibold text-lg mb-3">Поиск авиабилетов</h2>
          <SearchForm onSearch={handleSearch} />
        </div>

        {/* Results */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Поиск рейсов...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!isLoading && searched && flights.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-700 mb-2">Рейсы не найдены</p>
            <p className="text-sm text-gray-500">Попробуйте другие даты или маршруты</p>
          </div>
        )}

        {flights.length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-sm text-gray-500">
              Найдено {flights.length} рейсов
            </p>
            {flights.map((flight) => (
              <div key={flight.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <FlightCard flight={flight} />
                <div className="px-4 pb-3 flex items-center gap-2">
                  <a
                    href={`/booking/${flight.id}`}
                    className="flex-1 text-center py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Забронировать
                  </a>
                  <VKShareButton
                    variant="compact"
                    message={`Нашёл рейс ${flight.origin} \u2192 ${flight.destination} за ${flight.price.toLocaleString('ru-RU')} \u20BD на HopperRU!`}
                    link={`https://hopperru.ru/booking/${flight.id}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notifications prompt */}
        {isVK && !notificationsEnabled && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="font-semibold mb-2">Уведомления о ценах</h3>
            <p className="text-sm text-gray-600 mb-3">
              Разрешите уведомления, чтобы получать сигналы о снижении цен на ваши маршруты.
            </p>
            <button
              onClick={handleEnableNotifications}
              className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Включить уведомления
            </button>
          </div>
        )}

        {notificationsEnabled && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-green-700 text-sm">
            Уведомления включены! Мы сообщим, когда цены снизятся.
          </div>
        )}

        {/* Share section */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-2">Поделитесь с друзьями</h3>
          <p className="text-sm text-gray-600 mb-3">
            Расскажите друзьям о HopperRU и получите бонусы на следующую покупку.
          </p>
          <VKShareButton
            className="w-full"
            link="https://hopperru.ru?ref=vk"
          />
        </div>

        {/* Non-VK warning */}
        {!isVK && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
            <p className="font-medium mb-1">Режим предпросмотра</p>
            <p>
              Для полного функционала откройте как VK Mini App через ВКонтакте.
              Соцальное шаринг и авторизация работают только внутри VK.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
