import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Top-20 Russian domestic airports by passenger traffic */
const AIRPORTS = [
  { code: 'SVO', city: 'Москва', name: 'Шереметьево' },
  { code: 'DME', city: 'Москва', name: 'Домодедово' },
  { code: 'VKO', city: 'Москва', name: 'Внуково' },
  { code: 'LED', city: 'Санкт-Петербург', name: 'Пулково' },
  { code: 'AER', city: 'Сочи', name: 'Адлер' },
  { code: 'KRR', city: 'Краснодар', name: 'Пашковский' },
  { code: 'SVX', city: 'Екатеринбург', name: 'Кольцово' },
  { code: 'OVB', city: 'Новосибирск', name: 'Толмачёво' },
  { code: 'ROV', city: 'Ростов-на-Дону', name: 'Платов' },
  { code: 'KZN', city: 'Казань', name: 'Казань' },
  { code: 'UFA', city: 'Уфа', name: 'Уфа' },
  { code: 'VOG', city: 'Волгоград', name: 'Волгоград' },
  { code: 'KGD', city: 'Калининград', name: 'Храброво' },
  { code: 'MRV', city: 'Минеральные Воды', name: 'Минеральные Воды' },
  { code: 'AAQ', city: 'Анапа', name: 'Витязево' },
  { code: 'IKT', city: 'Иркутск', name: 'Иркутск' },
  { code: 'KHV', city: 'Хабаровск', name: 'Хабаровск' },
  { code: 'VVO', city: 'Владивосток', name: 'Владивосток' },
  { code: 'TJM', city: 'Тюмень', name: 'Рощино' },
  { code: 'CEK', city: 'Челябинск', name: 'Баландино' },
] as const;

/** Top-5 Russian airlines */
const AIRLINES = [
  { code: 'SU', name: 'Аэрофлот', hub: 'SVO' },
  { code: 'S7', name: 'S7 Airlines', hub: 'OVB' },
  { code: 'DP', name: 'Победа', hub: 'VKO' },
  { code: 'U6', name: 'Уральские авиалинии', hub: 'SVX' },
  { code: 'FV', name: 'Россия', hub: 'LED' },
] as const;

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Seed a demo user with home airport SVO
  const demoUser = await prisma.user.upsert({
    where: { telegram_id: 'demo_user_001' },
    update: {},
    create: {
      telegram_id: 'demo_user_001',
      email: 'demo@hopperru.local',
      name: 'Demo User',
      home_airport: 'SVO',
      preferences: {
        notification_channels: {
          PRICE_ALERT: ['TELEGRAM'],
          BOOKING_UPDATE: ['TELEGRAM', 'EMAIL'],
          WEEKLY_DIGEST: ['EMAIL'],
          PROMO: ['TELEGRAM'],
        },
        currency: 'RUB',
        timezone: 'Europe/Moscow',
        language: 'ru',
      },
    },
  });

  console.log(`  User seeded: ${demoUser.id} (${demoUser.name})`);

  // Seed sample flights between popular routes
  const routes = [
    { origin: 'SVO', destination: 'LED', airline: 'SU', price: 5500 },
    { origin: 'SVO', destination: 'AER', airline: 'SU', price: 8200 },
    { origin: 'DME', destination: 'KRR', airline: 'S7', price: 6100 },
    { origin: 'VKO', destination: 'KZN', airline: 'DP', price: 3200 },
    { origin: 'SVX', destination: 'SVO', airline: 'U6', price: 7800 },
    { origin: 'LED', destination: 'AER', airline: 'FV', price: 9500 },
    { origin: 'SVO', destination: 'OVB', airline: 'S7', price: 12000 },
    { origin: 'SVO', destination: 'KGD', airline: 'SU', price: 6800 },
    { origin: 'DME', destination: 'MRV', airline: 'U6', price: 5900 },
    { origin: 'VKO', destination: 'ROV', airline: 'DP', price: 4100 },
  ];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);

  for (const route of routes) {
    const departure = new Date(tomorrow);
    departure.setHours(8 + Math.floor(Math.random() * 12), 0, 0, 0);

    const durationMin = 120 + Math.floor(Math.random() * 180);
    const arrival = new Date(departure.getTime() + durationMin * 60 * 1000);

    await prisma.flight.create({
      data: {
        airline: route.airline,
        flight_number: `${route.airline}-${1000 + Math.floor(Math.random() * 9000)}`,
        origin: route.origin,
        destination: route.destination,
        departure_at: departure,
        arrival_at: arrival,
        duration_min: durationMin,
        cabin_class: 'ECONOMY',
        stops: 0,
        available_seats: 20 + Math.floor(Math.random() * 130),
        price: route.price,
        currency: 'RUB',
        source: 'API_DIRECT',
      },
    });
  }

  console.log(`  Flights seeded: ${routes.length} sample flights`);
  console.log('');
  console.log('Reference data (for application use):');
  console.log(`  Airports: ${AIRPORTS.length} (${AIRPORTS.map((a) => a.code).join(', ')})`);
  console.log(`  Airlines: ${AIRLINES.length} (${AIRLINES.map((a) => a.code).join(', ')})`);
  console.log('');
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
