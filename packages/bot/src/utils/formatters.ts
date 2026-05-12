/**
 * Format a price in Russian ruble format with space-separated thousands.
 * Example: 15400 -> "15 400 ₽"
 */
export function formatPrice(amount: number | { amount: number }): string {
  const value = typeof amount === 'number' ? amount : amount.amount;
  const formatted = value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${formatted} ₽`;
}

/**
 * Format a date string for display in Telegram messages.
 * Input: ISO date string or "YYYY-MM-DD"
 * Output: "15 июля 2026, Ср"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const weekday = weekdays[date.getDay()];

  return `${day} ${month} ${year}, ${weekday}`;
}

/**
 * Format a time from ISO date string.
 * Output: "14:30"
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format flight duration in hours and minutes.
 * Input: duration in minutes
 * Output: "2ч 35м"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}м`;
  if (mins === 0) return `${hours}ч`;
  return `${hours}ч ${mins}м`;
}

/**
 * Format a flight search result for Telegram Markdown display.
 */
export function formatFlightResult(flight: {
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration_min: number;
  stops: number;
  price: number | { amount: number };
  prediction?: {
    recommendation: string;
    confidence: number;
  };
}): string {
  const stopsText = flight.stops === 0
    ? 'прямой'
    : `${flight.stops} пересад.`;

  const predictionBadge = flight.prediction
    ? getPredictionBadge(flight.prediction.recommendation)
    : '';

  return (
    `✈️ *${flight.airline} ${flight.flight_number}*\n` +
    `${flight.origin} → ${flight.destination}\n` +
    `${formatTime(flight.departure_at)} — ${formatTime(flight.arrival_at)} (${formatDuration(flight.duration_min)})\n` +
    `${stopsText}\n` +
    `*${formatPrice(flight.price)}*${predictionBadge ? ` ${predictionBadge}` : ''}`
  );
}

/**
 * Get prediction badge text for inline display.
 */
function getPredictionBadge(recommendation: string): string {
  switch (recommendation) {
    case 'BUY_NOW':
      return '🟢 Купить';
    case 'WAIT':
      return '🟡 Подождать';
    default:
      return '';
  }
}
