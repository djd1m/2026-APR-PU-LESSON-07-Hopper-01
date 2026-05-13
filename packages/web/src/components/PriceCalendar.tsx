'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface PriceCalendarProps {
  /** Map of "YYYY-MM-DD" -> price (RUB) */
  prices: Record<string, number>;
  selectedDate: string;
  origin: string;
  destination: string;
}

export function PriceCalendar({ prices, selectedDate, origin, destination }: PriceCalendarProps) {
  const router = useRouter();

  const { days, month, year, minPrice, maxPrice } = useMemo(() => {
    const entries = Object.entries(prices);
    if (entries.length === 0) {
      const now = new Date();
      return { days: [], month: now.getMonth(), year: now.getFullYear(), minPrice: 0, maxPrice: 0 };
    }

    // Determine month from selected date or first available price
    const refDate = selectedDate ? new Date(selectedDate) : new Date(entries[0][0]);
    const m = refDate.getMonth();
    const y = refDate.getFullYear();

    const priceValues = entries.map(([, p]) => p);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);

    // Generate days for the month
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayOfWeek = (new Date(y, m, 1).getDay() + 6) % 7; // Monday = 0

    const daysList: { day: number; date: string; price?: number }[] = [];

    // Empty padding for days before the 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
      daysList.push({ day: 0, date: '' });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysList.push({
        day: d,
        date: dateStr,
        price: prices[dateStr],
      });
    }

    return { days: daysList, month: m, year: y, minPrice: min, maxPrice: max };
  }, [prices, selectedDate]);

  const MONTHS_RU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];

  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getPriceColor = (price: number | undefined): string => {
    if (price === undefined) return 'bg-gray-50 text-gray-300';
    const range = maxPrice - minPrice;
    if (range === 0) return 'bg-price-cheap/20 text-price-cheap';
    const ratio = (price - minPrice) / range;
    if (ratio < 0.33) return 'bg-price-cheap/20 text-price-cheap';
    if (ratio < 0.66) return 'bg-price-medium/20 text-price-medium';
    return 'bg-price-expensive/20 text-price-expensive';
  };

  const handleDayClick = (date: string) => {
    if (!date) return;
    const params = new URLSearchParams({ origin, destination, date, passengers: '1' });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div>
      <p className="text-center font-medium mb-3">
        {MONTHS_RU[month]} {year}
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-gray-400 font-medium py-1">{wd}</div>
        ))}

        {days.map((d, i) => (
          <button
            key={i}
            disabled={d.day === 0 || d.price === undefined}
            onClick={() => handleDayClick(d.date)}
            className={`
              p-1 rounded text-xs transition-colors
              ${d.day === 0 ? 'invisible' : ''}
              ${d.date === selectedDate ? 'ring-2 ring-primary-500' : ''}
              ${d.price !== undefined ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
              ${getPriceColor(d.price)}
            `}
          >
            {d.day > 0 && (
              <>
                <div className="font-medium">{d.day}</div>
                {d.price !== undefined && (
                  <div className="text-[10px] leading-tight">
                    {Math.round(d.price / 1000)}k
                  </div>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-price-cheap/30" /> Дёшево
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-price-medium/30" /> Средне
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-price-expensive/30" /> Дорого
        </span>
      </div>
    </div>
  );
}
