'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchFormProps {
  compact?: boolean;
  defaultValues?: {
    origin: string;
    destination: string;
    date: string;
    passengers: number;
  };
}

// TODO: Replace with API-driven autocomplete
const POPULAR_AIRPORTS = [
  { code: 'SVO', city: 'Москва (Шереметьево)' },
  { code: 'DME', city: 'Москва (Домодедово)' },
  { code: 'VKO', city: 'Москва (Внуково)' },
  { code: 'LED', city: 'Санкт-Петербург' },
  { code: 'AER', city: 'Сочи' },
  { code: 'SVX', city: 'Екатеринбург' },
  { code: 'KZN', city: 'Казань' },
  { code: 'OVB', city: 'Новосибирск' },
  { code: 'IST', city: 'Стамбул' },
  { code: 'AYT', city: 'Анталья' },
];

export function SearchForm({ compact = false, defaultValues }: SearchFormProps) {
  const router = useRouter();

  const [origin, setOrigin] = useState(defaultValues?.origin || '');
  const [destination, setDestination] = useState(defaultValues?.destination || '');
  const [date, setDate] = useState(defaultValues?.date || '');
  const [passengers, setPassengers] = useState(defaultValues?.passengers || 1);
  const [originSuggestions, setOriginSuggestions] = useState<typeof POPULAR_AIRPORTS>([]);
  const [destSuggestions, setDestSuggestions] = useState<typeof POPULAR_AIRPORTS>([]);

  const filterAirports = useCallback((query: string) => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return POPULAR_AIRPORTS.filter(
      (a) => a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;

    const params = new URLSearchParams({
      origin,
      destination,
      date,
      passengers: passengers.toString(),
    });

    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${
        compact
          ? 'flex flex-wrap gap-3 items-end'
          : 'bg-white rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-4 gap-4'
      }`}
    >
      {/* Origin */}
      <div className={compact ? 'flex-1 min-w-[150px]' : ''}>
        {!compact && <label className="block text-sm font-medium text-gray-700 mb-1">Откуда</label>}
        <div className="relative">
          <input
            className="input-field"
            placeholder="Москва (SVO)"
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setOriginSuggestions(filterAirports(e.target.value));
            }}
            onBlur={() => setTimeout(() => setOriginSuggestions([]), 200)}
            required
          />
          {originSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
              {originSuggestions.map((a) => (
                <li
                  key={a.code}
                  className="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                  onMouseDown={() => {
                    setOrigin(a.code);
                    setOriginSuggestions([]);
                  }}
                >
                  <span className="font-medium">{a.code}</span> — {a.city}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Destination */}
      <div className={compact ? 'flex-1 min-w-[150px]' : ''}>
        {!compact && <label className="block text-sm font-medium text-gray-700 mb-1">Куда</label>}
        <div className="relative">
          <input
            className="input-field"
            placeholder="Сочи (AER)"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setDestSuggestions(filterAirports(e.target.value));
            }}
            onBlur={() => setTimeout(() => setDestSuggestions([]), 200)}
            required
          />
          {destSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
              {destSuggestions.map((a) => (
                <li
                  key={a.code}
                  className="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                  onMouseDown={() => {
                    setDestination(a.code);
                    setDestSuggestions([]);
                  }}
                >
                  <span className="font-medium">{a.code}</span> — {a.city}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Date */}
      <div className={compact ? 'flex-1 min-w-[150px]' : ''}>
        {!compact && <label className="block text-sm font-medium text-gray-700 mb-1">Дата вылета</label>}
        <input
          className="input-field"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* Passengers */}
      <div className={compact ? 'flex items-end gap-3' : ''}>
        {!compact && <label className="block text-sm font-medium text-gray-700 mb-1">Пассажиры</label>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            onClick={() => setPassengers((p) => Math.max(1, p - 1))}
          >
            -
          </button>
          <span className="w-8 text-center font-medium">{passengers}</span>
          <button
            type="button"
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            onClick={() => setPassengers((p) => Math.min(9, p + 1))}
          >
            +
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className={compact ? '' : 'md:col-span-4'}>
        <button type="submit" className="btn-primary w-full">
          {compact ? 'Найти' : 'Найти рейсы'}
        </button>
      </div>
    </form>
  );
}
