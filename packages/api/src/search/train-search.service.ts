import { Injectable, Logger } from '@nestjs/common';

/** Russian railway routes with distances and train types */
const TRAIN_ROUTES: Array<{
  origin: string;
  destination: string;
  distance_km: number;
  trains: Array<{
    type: 'sapsan' | 'lastochka' | 'firmenny' | 'passenger';
    name: string;
    number: string;
    duration_min: number;
    classes: Array<{
      code: string;
      name: string;
      price_factor: number;
    }>;
    departures: string[]; // HH:MM times
  }>;
}> = [
  {
    origin: 'Москва',
    destination: 'Санкт-Петербург',
    distance_km: 700,
    trains: [
      {
        type: 'sapsan',
        name: 'Сапсан',
        number: '751А',
        duration_min: 225,
        classes: [
          { code: 'business', name: 'Бизнес-класс', price_factor: 3.0 },
          { code: 'first', name: 'Первый класс', price_factor: 1.8 },
          { code: 'economy_plus', name: 'Эконом+', price_factor: 1.3 },
          { code: 'economy', name: 'Эконом', price_factor: 1.0 },
        ],
        departures: ['05:40', '06:30', '07:00', '09:30', '11:30', '13:30', '15:30', '17:30', '19:30'],
      },
      {
        type: 'firmenny',
        name: 'Красная стрела',
        number: '001А',
        duration_min: 480,
        classes: [
          { code: 'sv', name: 'СВ (люкс)', price_factor: 3.5 },
          { code: 'kupe', name: 'Купе', price_factor: 1.5 },
        ],
        departures: ['23:55'],
      },
      {
        type: 'passenger',
        name: 'Пассажирский',
        number: '025А',
        duration_min: 540,
        classes: [
          { code: 'kupe', name: 'Купе', price_factor: 1.2 },
          { code: 'platskart', name: 'Плацкарт', price_factor: 0.6 },
        ],
        departures: ['22:30'],
      },
    ],
  },
  {
    origin: 'Москва',
    destination: 'Нижний Новгород',
    distance_km: 440,
    trains: [
      {
        type: 'lastochka',
        name: 'Ласточка',
        number: '701',
        duration_min: 230,
        classes: [
          { code: 'first', name: 'Первый класс', price_factor: 1.5 },
          { code: 'economy', name: 'Стандарт', price_factor: 1.0 },
        ],
        departures: ['06:40', '07:15', '14:05', '16:45', '19:30'],
      },
      {
        type: 'firmenny',
        name: 'Фирменный',
        number: '059А',
        duration_min: 360,
        classes: [
          { code: 'kupe', name: 'Купе', price_factor: 1.4 },
          { code: 'platskart', name: 'Плацкарт', price_factor: 0.5 },
        ],
        departures: ['23:00'],
      },
    ],
  },
  {
    origin: 'Москва',
    destination: 'Казань',
    distance_km: 815,
    trains: [
      {
        type: 'firmenny',
        name: 'Премиум',
        number: '002А',
        duration_min: 780,
        classes: [
          { code: 'sv', name: 'СВ', price_factor: 3.0 },
          { code: 'kupe', name: 'Купе', price_factor: 1.5 },
          { code: 'platskart', name: 'Плацкарт', price_factor: 0.6 },
        ],
        departures: ['20:10', '21:30'],
      },
      {
        type: 'passenger',
        name: 'Пассажирский',
        number: '092А',
        duration_min: 840,
        classes: [
          { code: 'kupe', name: 'Купе', price_factor: 1.2 },
          { code: 'platskart', name: 'Плацкарт', price_factor: 0.5 },
        ],
        departures: ['18:45'],
      },
    ],
  },
  {
    origin: 'Москва',
    destination: 'Сочи',
    distance_km: 1622,
    trains: [
      {
        type: 'firmenny',
        name: 'Двухэтажный',
        number: '104В',
        duration_min: 1440,
        classes: [
          { code: 'sv', name: 'СВ', price_factor: 3.0 },
          { code: 'kupe', name: 'Купе', price_factor: 1.5 },
          { code: 'platskart', name: 'Плацкарт', price_factor: 0.6 },
        ],
        departures: ['14:30'],
      },
    ],
  },
  {
    origin: 'Санкт-Петербург',
    destination: 'Москва',
    distance_km: 700,
    trains: [
      {
        type: 'sapsan',
        name: 'Сапсан',
        number: '752А',
        duration_min: 225,
        classes: [
          { code: 'business', name: 'Бизнес-класс', price_factor: 3.0 },
          { code: 'first', name: 'Первый класс', price_factor: 1.8 },
          { code: 'economy', name: 'Эконом', price_factor: 1.0 },
        ],
        departures: ['05:30', '06:45', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'],
      },
    ],
  },
];

interface TrainResult {
  id: string;
  train_number: string;
  train_name: string;
  train_type: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration_min: number;
  classes: Array<{
    code: string;
    name: string;
    price: number;
    currency: string;
    available_seats: number;
  }>;
  distance_km: number;
}

interface TrainSearchResponse {
  trains: TrainResult[];
  metadata: {
    total: number;
    origin: string;
    destination: string;
    date: string;
  };
}

@Injectable()
export class TrainSearchService {
  private readonly logger = new Logger(TrainSearchService.name);

  /** Base price per km for platskart class */
  private readonly BASE_PRICE_PER_KM = 1.8;

  /**
   * Search trains by origin, destination, and date.
   * Returns mock RZD data with realistic pricing.
   */
  async searchTrains(
    origin: string,
    destination: string,
    date: string,
  ): Promise<TrainSearchResponse> {
    this.logger.log(
      `Searching trains: ${origin} -> ${destination} on ${date}`,
    );

    // Find matching routes (both directions)
    const matchingRoutes = TRAIN_ROUTES.filter(
      (r) =>
        r.origin.toLowerCase().includes(origin.toLowerCase()) &&
        r.destination.toLowerCase().includes(destination.toLowerCase()),
    );

    if (matchingRoutes.length === 0) {
      return {
        trains: [],
        metadata: { total: 0, origin, destination, date },
      };
    }

    const dateObj = new Date(date);
    const trains: TrainResult[] = [];

    for (const route of matchingRoutes) {
      for (const train of route.trains) {
        for (const departureTime of train.departures) {
          const [hours, minutes] = departureTime.split(':').map(Number);
          const depDate = new Date(dateObj);
          depDate.setHours(hours, minutes, 0, 0);

          const arrDate = new Date(depDate.getTime() + train.duration_min * 60000);

          // Calculate base price
          const basePrice = route.distance_km * this.BASE_PRICE_PER_KM;

          // Price adjustments
          let priceFactor = 1.0;
          const month = dateObj.getMonth() + 1;
          if (month >= 6 && month <= 8) priceFactor *= 1.3;
          if (month === 12 || month === 1) priceFactor *= 1.25;
          if (dateObj.getDay() === 5) priceFactor *= 1.15;
          if (dateObj.getDay() === 0) priceFactor *= 1.1;

          // Sapsan premium
          if (train.type === 'sapsan') priceFactor *= 2.2;
          if (train.type === 'lastochka') priceFactor *= 1.3;

          const seed = this.simpleHash(`${train.number}:${date}:${departureTime}`);

          const classes = train.classes.map((cls) => {
            const price = Math.round(
              basePrice * priceFactor * cls.price_factor / 100,
            ) * 100;
            return {
              code: cls.code,
              name: cls.name,
              price: Math.max(price, 500),
              currency: 'RUB',
              available_seats: 1 + (seed % 30),
            };
          });

          trains.push({
            id: `train-${train.number}-${date}-${departureTime.replace(':', '')}`,
            train_number: train.number,
            train_name: train.name,
            train_type: train.type,
            origin: route.origin,
            destination: route.destination,
            departure_at: depDate.toISOString(),
            arrival_at: arrDate.toISOString(),
            duration_min: train.duration_min,
            classes,
            distance_km: route.distance_km,
          });
        }
      }
    }

    // Sort by departure time
    trains.sort(
      (a, b) =>
        new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime(),
    );

    return {
      trains,
      metadata: { total: trains.length, origin, destination, date },
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
