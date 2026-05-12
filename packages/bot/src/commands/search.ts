import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../bot';
import { apiClient } from '../services/api-client';
import { formatFlightResult, formatPrice } from '../utils/formatters';

/**
 * Parse natural language search query.
 * Supports patterns like: "Москва Сочи июль", "SVO AER 15.07"
 */
function parseSearchQuery(text: string): {
  origin: string;
  destination: string;
  date?: string;
} | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return null;

  // Month names mapping (Russian)
  const months: Record<string, string> = {
    'январь': '01', 'января': '01', 'янв': '01',
    'февраль': '02', 'февраля': '02', 'фев': '02',
    'март': '03', 'марта': '03', 'мар': '03',
    'апрель': '04', 'апреля': '04', 'апр': '04',
    'май': '05', 'мая': '05',
    'июнь': '06', 'июня': '06', 'июн': '06',
    'июль': '07', 'июля': '07', 'июл': '07',
    'август': '08', 'августа': '08', 'авг': '08',
    'сентябрь': '09', 'сентября': '09', 'сен': '09',
    'октябрь': '10', 'октября': '10', 'окт': '10',
    'ноябрь': '11', 'ноября': '11', 'ноя': '11',
    'декабрь': '12', 'декабря': '12', 'дек': '12',
  };

  const origin = parts[0];
  const destination = parts[1];
  let date: string | undefined;

  if (parts.length >= 3) {
    const dateStr = parts[2].toLowerCase();
    // Check if it's a month name
    if (months[dateStr]) {
      const year = new Date().getFullYear();
      const month = months[dateStr];
      date = `${year}-${month}-15`; // Default to mid-month
    }
    // Check if it's a date like DD.MM or DD.MM.YYYY
    const dateMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || new Date().getFullYear().toString();
      date = `${year}-${month}-${day}`;
    }
  }

  return { origin, destination, date };
}

export function registerSearchCommand(bot: Telegraf<BotContext>): void {
  // Explicit /search command
  bot.command('search', async (ctx) => {
    const args = ctx.message.text.replace(/^\/search\s*/, '').trim();

    if (!args) {
      await ctx.reply(
        'Укажите маршрут и дату:\n\n' +
        'Примеры:\n' +
        '/search Москва Сочи июль\n' +
        '/search SVO AER 15.07\n\n' +
        'Или просто напишите: Москва Сочи июль'
      );
      return;
    }

    await handleSearch(ctx, args);
  });

  // Natural language handler: intercept text messages that look like search queries
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    // Skip if it's a command
    if (text.startsWith('/')) return;

    const parsed = parseSearchQuery(text);
    if (!parsed) return; // Not a recognizable search query

    await handleSearch(ctx, text);
  });
}

async function handleSearch(ctx: BotContext, query: string): Promise<void> {
  const parsed = parseSearchQuery(query);
  if (!parsed) {
    await ctx.reply('Не удалось распознать запрос. Попробуйте: Москва Сочи июль');
    return;
  }

  await ctx.reply(`Ищу рейсы ${parsed.origin} → ${parsed.destination}...`);

  try {
    const response = await apiClient.get('/flights/search', {
      params: {
        origin: parsed.origin,
        destination: parsed.destination,
        departure_date: parsed.date,
      },
    });

    const flights = response.data.flights;

    if (!flights || flights.length === 0) {
      await ctx.reply('Рейсы не найдены. Попробуйте другие даты.');
      return;
    }

    // Show top 5 results with inline buttons
    const topFlights = flights.slice(0, 5);

    for (const flight of topFlights) {
      const text = formatFlightResult(flight);
      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            `Выбрать ${formatPrice(flight.price)}`,
            `select_flight:${flight.id}`
          ),
        ],
        [
          Markup.button.callback('Заморозить цену', `freeze:${flight.id}`),
          Markup.button.callback('Прогноз цены', `predict:${flight.id}`),
        ],
      ]);

      await ctx.reply(text, { parse_mode: 'Markdown', ...buttons });
    }
  } catch (err) {
    console.error('[bot] Search error:', err);
    await ctx.reply('Ошибка при поиске. Попробуйте позже.');
  }
}
