import { Telegraf } from 'telegraf';
import { BotContext } from '../bot';
import { apiClient } from '../services/api-client';

const WELCOME_MESSAGE = `
Добро пожаловать в HopperRU!

Я помогу найти лучшие цены на авиабилеты и подскажу, когда покупать.

Что я умею:
/search — Поиск авиабилетов
/alerts — Управление ценовыми уведомлениями
/bookings — Мои бронирования
/help — Помощь

Или просто напишите маршрут, например:
"Москва Сочи июль"
"из Питера в Краснодар 15 августа"
`.trim();

export function registerStartCommand(bot: Telegraf<BotContext>): void {
  bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
    const username = ctx.from.username || undefined;

    try {
      // Register or update user via internal API
      await apiClient.post('/auth/telegram-register', {
        telegram_id: telegramId,
        name,
        username,
        language_code: ctx.from.language_code || 'ru',
      });
      console.log(`[bot] User registered: ${telegramId} (${name})`);
    } catch (err) {
      // Non-blocking: user may already exist, or API may be down
      console.warn('[bot] User registration failed:', (err as Error).message);
    }

    await ctx.reply(WELCOME_MESSAGE);
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      'Как искать рейсы:\n\n' +
      '1. Напишите маршрут: "Москва Сочи июль"\n' +
      '2. Используйте команду: /search SVO AER 15.07\n' +
      '3. Указывайте города: "из Питера в Краснодар"\n\n' +
      'Доступные команды:\n' +
      '/search — Поиск рейсов\n' +
      '/bookings — Мои бронирования\n' +
      '/alerts — Ценовые уведомления\n' +
      '/help — Эта справка\n\n' +
      'Поддерживаемые города: Москва, Питер, Сочи, Краснодар, Казань, Екатеринбург, Новосибирск, Калининград и др.'
    );
  });
}
