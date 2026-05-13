'use client';

interface TrainClass {
  code: string;
  name: string;
  price: number;
  currency: string;
  available_seats: number;
}

interface TrainCardProps {
  train: {
    id: string;
    train_number: string;
    train_name: string;
    train_type: string;
    origin: string;
    destination: string;
    departure_at: string;
    arrival_at: string;
    duration_min: number;
    classes: TrainClass[];
    distance_km: number;
  };
}

const TRAIN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  sapsan: { label: 'Сапсан', color: 'bg-red-100 text-red-700' },
  lastochka: { label: 'Ласточка', color: 'bg-blue-100 text-blue-700' },
  firmenny: { label: 'Фирменный', color: 'bg-purple-100 text-purple-700' },
  passenger: { label: 'Пассажирский', color: 'bg-gray-100 text-gray-700' },
};

export function TrainCard({ train }: TrainCardProps) {
  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' \u20BD';

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} мин`;
    if (mins === 0) return `${hours} ч`;
    return `${hours} ч ${mins} мин`;
  };

  const typeInfo = TRAIN_TYPE_LABELS[train.train_type] || {
    label: train.train_type,
    color: 'bg-gray-100 text-gray-700',
  };

  const cheapestClass = train.classes.reduce((min, cls) =>
    cls.price < min.price ? cls : min,
  );

  const depDate = formatDate(train.departure_at);
  const arrDate = formatDate(train.arrival_at);
  const isOvernight = depDate !== arrDate;

  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Header: train info + type badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}
          >
            {typeInfo.label}
          </span>
          <span className="text-sm text-gray-500">
            {train.train_number} &mdash; {train.train_name}
          </span>
        </div>
        <span className="text-xs text-gray-400">{train.distance_km} км</span>
      </div>

      {/* Route timeline */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <p className="text-xl font-bold">{formatTime(train.departure_at)}</p>
          <p className="text-sm text-gray-500">{train.origin}</p>
          {isOvernight && (
            <p className="text-xs text-gray-400">{depDate}</p>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center">
          <span className="text-xs text-gray-400 mb-1">
            {formatDuration(train.duration_min)}
          </span>
          <div className="w-full h-px bg-gray-300 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl font-bold">{formatTime(train.arrival_at)}</p>
          <p className="text-sm text-gray-500">{train.destination}</p>
          {isOvernight && (
            <p className="text-xs text-gray-400">{arrDate}</p>
          )}
        </div>
      </div>

      {/* Class options */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {train.classes.map((cls) => (
          <div
            key={cls.code}
            className={`p-2 rounded-lg border text-center cursor-pointer transition-colors hover:border-primary-300 ${
              cls.code === cheapestClass.code
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-200'
            }`}
          >
            <p className="text-xs text-gray-500 mb-0.5">{cls.name}</p>
            <p className="font-semibold text-sm">{formatPrice(cls.price)}</p>
            {cls.available_seats <= 5 && (
              <p className="text-xs text-red-500 mt-0.5">
                {cls.available_seats} мест
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
