import { Telegraf } from 'telegraf';
import { BotContext } from '../bot';
import { apiClient } from '../services/api-client';

const WELCOME_MESSAGE = `
Добро пожаловать в HopperRU! ✈️

Я помогу найти лучшие цены на авиабилеты и подскажу, когда покупать.

Что я умею:
/search — Поиск авиабилетов
/alerts — Управление ценовыми уведомлениями
/bookings — Мои бронирования

Или просто напишите маршрут, например:
"Москва Сочи июль"
`.trim();

export function registerStartCommand(bot: Telegraf<BotContext>): void {
  bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

    try {
      // Register user via internal API
      await apiClient.post('/users/register', {
        telegram_id: telegramId,
        name,
      });
    } catch (err) {
      // Non-blocking: user may already exist, or API may be down
      console.warn('[bot] User registration failed:', (err as Error).message);
    }

    await ctx.reply(WELCOME_MESSAGE);
  });
}
