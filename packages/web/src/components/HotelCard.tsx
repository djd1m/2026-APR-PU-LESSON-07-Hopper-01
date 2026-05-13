'use client';

interface HotelCardProps {
  hotel: {
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
    nights: number;
    available_rooms: number;
  };
}

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  pool: 'Бассейн',
  spa: 'СПА',
  gym: 'Фитнес',
  restaurant: 'Ресторан',
  parking: 'Парковка',
  beach: 'Пляж',
  ski: 'Лыжи',
  concierge: 'Консьерж',
};

export function HotelCard({ hotel }: HotelCardProps) {
  const formatPrice = (amount: number) =>
    amount.toLocaleString('ru-RU') + ' \u20BD';

  const stars = '\u2605'.repeat(hotel.stars) + '\u2606'.repeat(5 - hotel.stars);

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Hotel image placeholder */}
        <div className="w-full sm:w-48 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm flex-shrink-0">
          {hotel.city}
        </div>

        {/* Hotel info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg leading-tight">{hotel.name}</h3>
              <p className="text-sm text-gray-500">
                {hotel.district}, {hotel.city}
              </p>
              <p className="text-yellow-500 text-sm mt-0.5">{stars}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold text-primary-500">
                {formatPrice(hotel.price_per_night)}
              </p>
              <p className="text-xs text-gray-500">за ночь</p>
              {hotel.nights > 1 && (
                <p className="text-sm text-gray-600 mt-1">
                  Итого: {formatPrice(hotel.total_price)}
                  <span className="text-xs text-gray-400 ml-1">
                    ({hotel.nights} {getNightsWord(hotel.nights)})
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-0.5 rounded text-sm font-medium text-white ${
                hotel.rating >= 4.5
                  ? 'bg-green-500'
                  : hotel.rating >= 4.0
                  ? 'bg-green-400'
                  : hotel.rating >= 3.5
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}
            >
              {hotel.rating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">
              {hotel.reviews_count} {getReviewsWord(hotel.reviews_count)}
            </span>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {hotel.amenities.slice(0, 6).map((amenity) => (
              <span
                key={amenity}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
              >
                {AMENITY_LABELS[amenity] || amenity}
              </span>
            ))}
            {hotel.amenities.length > 6 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                +{hotel.amenities.length - 6}
              </span>
            )}
          </div>

          {/* Availability */}
          {hotel.available_rooms <= 3 && (
            <p className="text-sm text-red-500 mt-2">
              Осталось {hotel.available_rooms} {getRoomsWord(hotel.available_rooms)}!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getNightsWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'ночь';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'ночи';
  return 'ночей';
}

function getReviewsWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'отзыв';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'отзыва';
  return 'отзывов';
}

function getRoomsWord(n: number): string {
  if (n === 1) return 'номер';
  if ([2, 3, 4].includes(n)) return 'номера';
  return 'номеров';
}
