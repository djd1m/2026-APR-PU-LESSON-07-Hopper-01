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

/** All 20 supported Russian domestic airports (matches shared/constants SUPPORTED_AIRPORTS) */
const SUPPORTED_AIRPORTS = [
  { code: 'SVO', city: 'Москва (Шереметьево)' },
  { code: 'DME', city: 'Москва (Домодедово)' },
  { code: 'VKO', city: 'Москва (Внуково)' },
  { code: 'LED', city: 'Санкт-Петербург (Пулково)' },
  { code: 'AER', city: 'Сочи (Адлер)' },
  { code: 'KRR', city: 'Краснодар (Пашковский)' },
  { code: 'SVX', city: 'Екатеринбург (Кольцово)' },
  { code: 'OVB', city: 'Новосибирск (Толмачёво)' },
  { code: 'ROV', city: 'Ростов-на-Дону (Платов)' },
  { code: 'KZN', city: 'Казань' },
  { code: 'UFA', city: 'Уфа' },
  { code: 'VOG', city: 'Волгоград' },
  { code: 'KGD', city: 'Калининград (Храброво)' },
  { code: 'MRV', city: 'Минеральные Воды' },
  { code: 'AAQ', city: 'Анапа (Витязево)' },
  { code: 'IKT', city: 'Иркутск' },
  { code: 'KHV', city: 'Хабаровск' },
  { code: 'VVO', city: 'Владивосток' },
  { code: 'TJM', city: 'Тюмень (Рощино)' },
  { code: 'CEK', city: 'Челябинск (Баландино)' },
];

export function SearchForm({ compact = false, defaultValues }: SearchFormProps) {
  const router = useRouter();

  const [origin, setOrigin] = useState(defaultValues?.origin || '');
  const [originDisplay, setOriginDisplay] = useState(() => {
    const ap = SUPPORTED_AIRPORTS.find((a) => a.code === defaultValues?.origin);
    return ap ? `${ap.code} - ${ap.city}` : defaultValues?.origin || '';
  });
  const [destination, setDestination] = useState(defaultValues?.destination || '');
  const [destDisplay, setDestDisplay] = useState(() => {
    const ap = SUPPORTED_AIRPORTS.find((a) => a.code === defaultValues?.destination);
    return ap ? `${ap.code} - ${ap.city}` : defaultValues?.destination || '';
  });
  const [date, setDate] = useState(defaultValues?.date || '');
  const [passengers, setPassengers] = useState(defaultValues?.passengers || 1);
  const [originSuggestions, setOriginSuggestions] = useState<typeof SUPPORTED_AIRPORTS>([]);
  const [destSuggestions, setDestSuggestions] = useState<typeof SUPPORTED_AIRPORTS>([]);
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused, setDestFocused] = useState(false);

  const filterAirports = useCallback((query: string, exclude?: string) => {
    if (query.length < 1) return SUPPORTED_AIRPORTS.filter((a) => a.code !== exclude);
    const q = query.toLowerCase();
    return SUPPORTED_AIRPORTS.filter(
      (a) =>
        a.code !== exclude &&
        (a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q))
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !date) return;

    const params = new URLSearchParams({
      origin,
      destination,
      date,
      passengers: passengers.toString(),
    });

    router.push(`/search?${params.toString()}`);
  };

  const swapAirports = () => {
    setOrigin(destination);
    setOriginDisplay(destDisplay);
    setDestination(origin);
    setDestDisplay(originDisplay);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${
        compact
          ? 'flex flex-wrap gap-3 items-end'
          : 'bg-white rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-5 gap-4'
      }`}
    >
      {/* Origin */}
      <div className={compact ? 'flex-1 min-w-[150px]' : ''}>
        {!compact && <label className="block text-sm font-medium text-gray-700 mb-1">Откуда</label>}
        <div className="relative">
          <input
            className="input-field"
            placeholder="Москва (SVO)"
            value={originDisplay}
            onChange={(e) => {
              setOriginDisplay(e.target.value);
              setOrigin(''); // Clear code until user selects from list
              setOriginSuggestions(filterAirports(e.target.value, destination));
            }}
            onFocus={() => {
              setOriginFocused(true);
              setOriginSuggestions(filterAirports(originDisplay, destination));
            }}
            onBlur={() => setTimeout(() => { setOriginFocused(false); setOriginSuggestions([]); }, 200)}
            required
          />
          {originFocused && originSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
              {originSuggestions.map((a) => (
                <li
                  key={a.code}
                  className="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                  onMouseDown={() => {
                    setOrigin(a.code);
                    setOriginDisplay(`${a.code} - ${a.city}`);
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

      {/* Swap button */}
      {!compact && (
        <div className="flex items-end justify-center pb-1">
          <button
            type="button"
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={swapAirports}
            title="Поменять местами"
          >
            &#8646;
          </button>
        </div>
      )}

      {/* Destination */}
      <div className={compact ? 'flex-1 min-w-[150px]' : ''}>
        {!compact && <label className="block text-sm font-medium text-gray-700 mb-1">Куда</label>}
        <div className="relative">
          <input
            className="input-field"
            placeholder="Сочи (AER)"
            value={destDisplay}
            onChange={(e) => {
              setDestDisplay(e.target.value);
              setDestination('');
              setDestSuggestions(filterAirports(e.target.value, origin));
            }}
            onFocus={() => {
              setDestFocused(true);
              setDestSuggestions(filterAirports(destDisplay, origin));
            }}
            onBlur={() => setTimeout(() => { setDestFocused(false); setDestSuggestions([]); }, 200)}
            required
          />
          {destFocused && destSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
              {destSuggestions.map((a) => (
                <li
                  key={a.code}
                  className="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                  onMouseDown={() => {
                    setDestination(a.code);
                    setDestDisplay(`${a.code} - ${a.city}`);
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
          required
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
      <div className={compact ? '' : 'md:col-span-5'}>
        <button type="submit" className="btn-primary w-full">
          {compact ? 'Найти' : 'Найти рейсы'}
        </button>
      </div>
    </form>
  );
}
