'use client';

import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { SearchForm } from '@/components/SearchForm';
import { FlightCard } from '@/components/FlightCard';
import { apiClient } from '@/lib/api';

type View = 'search' | 'results' | 'booking';

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
 * Telegram Mini App entry point.
 * Adapted for Telegram WebApp SDK: uses native MainButton, BackButton,
 * adapts theme colors, and provides streamlined mobile-first UX.
 */
export default function TelegramMiniAppPage() {
  const {
    isTelegram,
    user,
    colorScheme,
    themeParams,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    haptic,
    close,
    platform,
  } = useTelegramWebApp();

  const [view, setView] = useState<View>('search');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply Telegram theme
  const isDark = colorScheme === 'dark';
  const bgColor = themeParams.bg_color || (isDark ? '#1a1a2e' : '#ffffff');
  const textColor = themeParams.text_color || (isDark ? '#ffffff' : '#000000');
  const hintColor = themeParams.hint_color || (isDark ? '#aaaaaa' : '#999999');

  // Handle back navigation
  useEffect(() => {
    if (view === 'search') {
      hideBackButton();
    } else {
      showBackButton(() => {
        if (view === 'booking') {
          setView('results');
          setSelectedFlight(null);
        } else {
          setView('search');
          setFlights([]);
        }
      });
    }
  }, [view, showBackButton, hideBackButton]);

  // Handle main button for booking confirmation
  useEffect(() => {
    if (view === 'booking' && selectedFlight) {
      showMainButton(
        `Забронировать за ${selectedFlight.price.toLocaleString('ru-RU')} \u20BD`,
        async () => {
          haptic('medium');
          try {
            await apiClient('/bookings', {
              method: 'POST',
              body: JSON.stringify({
                flight_id: selectedFlight.id,
                telegram_id: user?.id?.toString(),
                passengers: [{
                  first_name: user?.first_name || '',
                  last_name: user?.last_name || '',
                }],
                payment_method: 'sbp',
                protections: [],
              }),
            });
            haptic('success');
            setView('search');
            setSelectedFlight(null);
            setFlights([]);
          } catch {
            haptic('error');
            setError('Ошибка при бронировании');
          }
        }
      );
    } else {
      hideMainButton();
    }
  }, [view, selectedFlight, user, showMainButton, hideMainButton, haptic]);

  const handleSearch = async (params: {
    origin: string;
    destination: string;
    departure_date: string;
    passengers?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    haptic('light');

    try {
      const query = new URLSearchParams({
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departure_date,
        passengers: String(params.passengers || 1),
      });
      const data = await apiClient<{ flights: Flight[] }>(`/search/flights?${query}`);
      setFlights(data.flights || []);
      setView('results');
    } catch {
      setError('Не удалось найти рейсы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFlight = (flight: Flight) => {
    haptic('light');
    setSelectedFlight(flight);
    setView('booking');
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">
          HopperRU
          {isTelegram && (
            <span className="text-xs font-normal ml-2" style={{ color: hintColor }}>
              Mini App {platform !== 'web' ? `(${platform})` : ''}
            </span>
          )}
        </h1>
        {user && (
          <p className="text-sm" style={{ color: hintColor }}>
            {user.first_name}{user.last_name ? ` ${user.last_name}` : ''}
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Search view */}
      {view === 'search' && (
        <div className="px-4">
          <div className="mb-4">
            <p className="text-sm mb-4" style={{ color: hintColor }}>
              Найдите дешёвые авиабилеты с AI-прогнозом цен
            </p>
          </div>
          <SearchForm
            onSearch={(origin, destination, date) =>
              handleSearch({ origin, destination, departure_date: date })
            }
          />

          {!isTelegram && (
            <div className="mt-6 p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
              <p className="font-medium mb-1">Режим предпросмотра</p>
              <p>
                Эта страница предназначена для Telegram Mini App.
                Для полного функционала откройте через Telegram бота @HopperRUBot.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results view */}
      {view === 'results' && (
        <div className="px-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p style={{ color: hintColor }}>Поиск рейсов...</p>
            </div>
          ) : flights.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg mb-2">Рейсы не найдены</p>
              <p className="text-sm" style={{ color: hintColor }}>
                Попробуйте другие даты или маршруты
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              <p className="text-sm" style={{ color: hintColor }}>
                Найдено {flights.length} рейсов
              </p>
              {flights.map((flight) => (
                <div
                  key={flight.id}
                  onClick={() => handleSelectFlight(flight)}
                  className="cursor-pointer"
                >
                  <FlightCard flight={flight} compact />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking view */}
      {view === 'booking' && selectedFlight && (
        <div className="px-4 pb-24">
          <div className="rounded-lg border p-4 mb-4" style={{
            borderColor: isDark ? '#333' : '#e5e7eb',
            backgroundColor: isDark ? '#262640' : '#f9fafb',
          }}>
            <p className="font-semibold text-lg">
              {selectedFlight.origin} &rarr; {selectedFlight.destination}
            </p>
            <p className="text-sm" style={{ color: hintColor }}>
              {selectedFlight.airline_name || selectedFlight.airline} {selectedFlight.flight_number}
            </p>
            <p className="text-sm" style={{ color: hintColor }}>
              {new Date(selectedFlight.departure_at).toLocaleString('ru-RU')}
            </p>
            <p className="text-2xl font-bold mt-3" style={{
              color: themeParams.link_color || '#2563eb',
            }}>
              {selectedFlight.price.toLocaleString('ru-RU')} &#8381;
            </p>
          </div>

          <p className="text-sm mb-2" style={{ color: hintColor }}>
            Нажмите кнопку ниже для бронирования.
            {isTelegram
              ? ' Оплата через СБП.'
              : ' Используйте Telegram Mini App для оплаты.'}
          </p>

          {!isTelegram && (
            <button
              onClick={() => {
                // Fallback for non-Telegram: show alert
                alert('Бронирование доступно через Telegram Mini App');
              }}
              className="w-full py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: themeParams.button_color || '#2563eb' }}
            >
              Забронировать за {selectedFlight.price.toLocaleString('ru-RU')} &#8381;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
