'use client';

import { PredictionBadge } from './PredictionBadge';

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

const AIRLINE_NAMES: Record<string, string> = {
  SU: 'Аэрофлот',
  S7: 'S7 Airlines',
  DP: 'Победа',
  U6: 'Уральские авиалинии',
  FV: 'Россия',
};

export function FlightCard({ flight }: { flight: Flight }) {
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };

  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' ₽';

  const stopsText =
    flight.stops === 0
      ? 'Прямой'
      : flight.stops === 1
        ? '1 пересадка'
        : `${flight.stops} пересадки`;

  const airlineName = AIRLINE_NAMES[flight.airline] || flight.airline;

  return (
    <a
      href={`/booking/${flight.id}`}
      className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary-300 transition-colors"
    >
      {/* Left: airline + times */}
      <div className="flex items-center gap-4 flex-1">
        {/* Airline logo placeholder */}
        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
          {flight.airline}
        </div>

        <div>
          <p className="font-medium text-sm text-gray-500">
            {airlineName} {flight.flight_number}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-semibold">{formatTime(flight.departure_at)}</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400">{formatDuration(flight.duration_min)}</span>
              <div className="w-20 h-px bg-gray-300 relative">
                {flight.stops > 0 && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400" />
                )}
              </div>
              <span className="text-xs text-gray-400">{stopsText}</span>
            </div>
            <span className="text-lg font-semibold">{formatTime(flight.arrival_at)}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {flight.origin} &rarr; {flight.destination}
          </p>
        </div>
      </div>

      {/* Right: price + prediction */}
      <div className="text-right">
        <p className="text-xl font-bold text-primary-500">{formatPrice(flight.price)}</p>
        {flight.prediction && (
          <div className="mt-1">
            <PredictionBadge
              recommendation={flight.prediction.recommendation}
              confidence={flight.prediction.confidence}
            />
          </div>
        )}
      </div>
    </a>
  );
}
