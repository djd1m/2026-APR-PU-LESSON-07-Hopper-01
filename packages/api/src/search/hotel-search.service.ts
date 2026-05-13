import { Injectable, Logger } from '@nestjs/common';

/** Mock hotel data for Russian cities */
const CITY_HOTELS: Record<string, Array<{
  name: string;
  stars: number;
  district: string;
  amenities: string[];
  basePrice: number;
}>> = {
  'Москва': [
    { name: 'Гранд Отель Москва', stars: 5, district: 'Тверская', amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'parking'], basePrice: 12000 },
    { name: 'Бизнес-Отель Сити', stars: 4, district: 'Москва-Сити', amenities: ['wifi', 'gym', 'restaurant', 'parking'], basePrice: 7500 },
    { name: 'Комфорт Инн Арбат', stars: 3, district: 'Арбат', amenities: ['wifi', 'restaurant'], basePrice: 4500 },
    { name: 'Хостел Красная Площадь', stars: 2, district: 'Китай-город', amenities: ['wifi'], basePrice: 1800 },
    { name: 'Парк Хаятт Москва', stars: 5, district: 'Большой Театр', amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'parking', 'concierge'], basePrice: 25000 },
    { name: 'Измайлово Гамма', stars: 3, district: 'Измайлово', amenities: ['wifi', 'restaurant', 'parking'], basePrice: 3200 },
    { name: 'Новотель Центр', stars: 4, district: 'Новослободская', amenities: ['wifi', 'gym', 'restaurant'], basePrice: 6800 },
  ],
  'Санкт-Петербург': [
    { name: 'Астория', stars: 5, district: 'Центр', amenities: ['wifi', 'spa', 'gym', 'restaurant', 'concierge'], basePrice: 15000 },
    { name: 'Отель Невский', stars: 4, district: 'Невский проспект', amenities: ['wifi', 'restaurant', 'parking'], basePrice: 6500 },
    { name: 'Мини-отель Канал', stars: 3, district: 'Канал Грибоедова', amenities: ['wifi', 'restaurant'], basePrice: 3800 },
    { name: 'Прибалтийская', stars: 4, district: 'Васильевский остров', amenities: ['wifi', 'pool', 'gym', 'restaurant', 'parking'], basePrice: 5500 },
    { name: 'Хостел Эрмитаж', stars: 2, district: 'Дворцовая', amenities: ['wifi'], basePrice: 1500 },
  ],
  'Сочи': [
    { name: 'Swissôtel Сочи Камелия', stars: 5, district: 'Центр', amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'beach', 'parking'], basePrice: 18000 },
    { name: 'Отель Жемчужина', stars: 4, district: 'Центральная набережная', amenities: ['wifi', 'pool', 'restaurant', 'beach'], basePrice: 8000 },
    { name: 'Гостевой дом Роза', stars: 3, district: 'Хоста', amenities: ['wifi', 'parking'], basePrice: 3000 },
    { name: 'Рэдиссон Роза Хутор', stars: 5, district: 'Красная Поляна', amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'ski'], basePrice: 22000 },
    { name: 'Апарт-отель Имеретинский', stars: 4, district: 'Олимпийский парк', amenities: ['wifi', 'pool', 'gym', 'parking'], basePrice: 6000 },
  ],
  'Казань': [
    { name: 'Корстон Казань', stars: 5, district: 'Центр', amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'parking'], basePrice: 9000 },
    { name: 'Ибис Казань Центр', stars: 3, district: 'Баумана', amenities: ['wifi', 'restaurant'], basePrice: 3500 },
    { name: 'Мираж', stars: 4, district: 'Кремль', amenities: ['wifi', 'gym', 'restaurant', 'parking'], basePrice: 5500 },
  ],
  'Краснодар': [
    { name: 'Marriott Краснодар', stars: 5, district: 'Центр', amenities: ['wifi', 'pool', 'gym', 'restaurant', 'parking'], basePrice: 8500 },
    { name: 'Отель Платан', stars: 3, district: 'Красная', amenities: ['wifi', 'restaurant'], basePrice: 3200 },
    { name: 'Хилтон Гарден Инн', stars: 4, district: 'ТРЦ Галерея', amenities: ['wifi', 'gym', 'restaurant', 'parking'], basePrice: 5000 },
  ],
};

/** Map IATA codes to city names */
const IATA_TO_CITY: Record<string, string> = {
  SVO: 'Москва', DME: 'Москва', VKO: 'Москва',
  LED: 'Санкт-Петербург',
  AER: 'Сочи',
  KZN: 'Казань',
  KRR: 'Краснодар',
  SVX: 'Екатеринбург',
  OVB: 'Новосибирск',
  KGD: 'Калининград',
  ROV: 'Ростов-на-Дону',
  UFA: 'Уфа',
};

interface HotelResult {
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
  photos_count: number;
  available_rooms: number;
  checkin: string;
  checkout: string;
  nights: number;
}

interface HotelSearchResponse {
  hotels: HotelResult[];
  metadata: {
    total: number;
    city: string;
    checkin: string;
    checkout: string;
    guests: number;
  };
}

@Injectable()
export class HotelSearchService {
  private readonly logger = new Logger(HotelSearchService.name);

  /**
   * Search hotels by city, dates, and guest count.
   * Returns mock hotel data for Russian cities.
   */
  async searchHotels(
    city: string,
    checkin: string,
    checkout: string,
    guests: number = 2,
    filters?: {
      min_stars?: number;
      max_stars?: number;
      min_price?: number;
      max_price?: number;
      amenities?: string[];
    },
  ): Promise<HotelSearchResponse> {
    // Resolve city name from IATA code if needed
    const cityName = IATA_TO_CITY[city.toUpperCase()] || city;
    const cityHotels = CITY_HOTELS[cityName];

    this.logger.log(
      `Searching hotels in ${cityName}: ${checkin} to ${checkout}, ${guests} guests`,
    );

    if (!cityHotels) {
      // Generate generic hotels for unknown cities
      return {
        hotels: this.generateGenericHotels(cityName, checkin, checkout, guests),
        metadata: { total: 3, city: cityName, checkin, checkout, guests },
      };
    }

    // Calculate nights
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const nights = Math.max(
      1,
      Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / 86400000),
    );

    // Generate results with price variation
    let hotels: HotelResult[] = cityHotels.map((h, i) => {
      // Price variation based on season, weekday, demand
      const month = checkinDate.getMonth() + 1;
      let priceFactor = 1.0;
      if (month >= 6 && month <= 8) priceFactor *= 1.4; // summer
      if (month === 12 || month === 1) priceFactor *= 1.3; // holidays
      if (checkinDate.getDay() === 5 || checkinDate.getDay() === 6) priceFactor *= 1.15;

      // Guest multiplier (slight increase for more guests)
      if (guests > 2) priceFactor *= 1 + (guests - 2) * 0.15;

      // Random-ish variation per hotel
      const seed = this.simpleHash(`${h.name}:${checkin}`);
      priceFactor *= 0.9 + (seed % 20) / 100;

      const pricePerNight = Math.round(h.basePrice * priceFactor / 100) * 100;
      const totalPrice = pricePerNight * nights;

      return {
        id: `hotel-${cityName.toLowerCase()}-${i}`,
        name: h.name,
        city: cityName,
        district: h.district,
        stars: h.stars,
        price_per_night: pricePerNight,
        total_price: totalPrice,
        currency: 'RUB',
        amenities: h.amenities,
        rating: 3.5 + (seed % 15) / 10, // 3.5-5.0
        reviews_count: 50 + (seed % 950),
        photos_count: 5 + (seed % 25),
        available_rooms: 1 + (seed % 10),
        checkin,
        checkout,
        nights,
      };
    });

    // Apply filters
    if (filters) {
      if (filters.min_stars) hotels = hotels.filter((h) => h.stars >= filters.min_stars!);
      if (filters.max_stars) hotels = hotels.filter((h) => h.stars <= filters.max_stars!);
      if (filters.min_price) hotels = hotels.filter((h) => h.price_per_night >= filters.min_price!);
      if (filters.max_price) hotels = hotels.filter((h) => h.price_per_night <= filters.max_price!);
      if (filters.amenities && filters.amenities.length > 0) {
        hotels = hotels.filter((h) =>
          filters.amenities!.every((a) => h.amenities.includes(a)),
        );
      }
    }

    // Sort by price
    hotels.sort((a, b) => a.price_per_night - b.price_per_night);

    return {
      hotels,
      metadata: { total: hotels.length, city: cityName, checkin, checkout, guests },
    };
  }

  private generateGenericHotels(
    city: string,
    checkin: string,
    checkout: string,
    guests: number,
  ): HotelResult[] {
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const nights = Math.max(
      1,
      Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / 86400000),
    );

    return [
      { name: `Центральный Отель ${city}`, stars: 4, price: 5500 },
      { name: `Гостиница ${city}`, stars: 3, price: 3000 },
      { name: `Бизнес-Отель ${city}`, stars: 4, price: 6000 },
    ].map((h, i) => ({
      id: `hotel-${city.toLowerCase()}-gen-${i}`,
      name: h.name,
      city,
      district: 'Центр',
      stars: h.stars,
      price_per_night: h.price,
      total_price: h.price * nights,
      currency: 'RUB',
      amenities: ['wifi', 'restaurant'],
      rating: 4.0,
      reviews_count: 100,
      photos_count: 10,
      available_rooms: 5,
      checkin,
      checkout,
      nights,
    }));
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
