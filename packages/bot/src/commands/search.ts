import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../bot';
import { apiClient } from '../services/api-client';
import { formatFlightResult, formatPrice } from '../utils/formatters';

/** City name to IATA code mapping for natural language parsing */
const CITY_TO_IATA: Record<string, string> = {
  'москва': 'SVO', 'мск': 'SVO', 'шереметьево': 'SVO',
  'домодедово': 'DME', 'внуково': 'VKO',
  'петербург': 'LED', 'спб': 'LED', 'питер': 'LED', 'пулково': 'LED',
  'сочи': 'AER', 'адлер': 'AER',
  'краснодар': 'KRR',
  'казань': 'KZN',
  'екатеринбург': 'SVX', 'екб': 'SVX',
  'новосибирск': 'OVB', 'нск': 'OVB',
  'калининград': 'KGD',
  'ростов': 'ROV',
  'уфа': 'UFA',
  'волгоград': 'VOG',
  'минеральные': 'MRV', 'минводы': 'MRV',
  'анапа': 'AAQ',
  'иркутск': 'IKT',
  'хабаровск': 'KHV',
  'владивосток': 'VVO',
  'тюмень': 'TJM',
  'челябинск': 'CEK',
};

/** Month names mapping (Russian) */
const MONTHS: Record<string, string> = {
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

/**
 * Parse natural language search query.
 * Supports patterns like:
 * - "Москва Сочи июль"
 * - "SVO AER 15.07"
 * - "из Питера в Краснодар на июнь"
 * - "хочу в Сочи из Москвы"
 * - "билеты мск екб 20 июля"
 */
function parseSearchQuery(text: string): {
  origin: string;
  destination: string;
  date?: string;
} | null {
  // Remove filler words
  let cleaned = text
    .replace(/билеты?\s*/gi, '')
    .replace(/авиабилеты?\s*/gi, '')
    .replace(/рейсы?\s*/gi, '')
    .replace(/перелёт\s*/gi, '')
    .replace(/перелет\s*/gi, '')
    .replace(/хочу\s*/gi, '')
    .replace(/найти?\s*/gi, '')
    .replace(/найди\s*/gi, '')
    .replace(/лететь\s*/gi, '')
    .trim();

  // Try "из X в Y" pattern
  const fromToMatch = cleaned.match(/из\s+(\S+)\s+в\s+(\S+)(?:\s+(.+))?/i);
  if (fromToMatch) {
    const origin = resolveCity(fromToMatch[1]);
    const destination = resolveCity(fromToMatch[2]);
    const date = fromToMatch[3] ? parseDate(fromToMatch[3].trim()) : undefined;
    if (origin && destination) return { origin, destination, date };
  }

  // Try "в X из Y" pattern
  const toFromMatch = cleaned.match(/в\s+(\S+)\s+из\s+(\S+)(?:\s+(.+))?/i);
  if (toFromMatch) {
    const destination = resolveCity(toFromMatch[1]);
    const origin = resolveCity(toFromMatch[2]);
    const date = toFromMatch[3] ? parseDate(toFromMatch[3].trim()) : undefined;
    if (origin && destination) return { origin, destination, date };
  }

  // Fallback: split by spaces, first two tokens are origin/destination
  const parts = cleaned.replace(/\s+на\s+/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/);
  if (parts.length < 2) return null;

  const origin = resolveCity(parts[0]);
  const destination = resolveCity(parts[1]);
  if (!origin || !destination) return null;

  const datePart = parts.slice(2).join(' ');
  const date = datePart ? parseDate(datePart) : undefined;

  return { origin, destination, date };
}

/** Resolve a city name or IATA code to an IATA code */
function resolveCity(input: string): string | null {
  const upper = input.toUpperCase();
  // Already an IATA code (3 uppercase letters)
  if (/^[A-Z]{3}$/.test(upper)) return upper;

  const lower = input.toLowerCase();
  if (CITY_TO_IATA[lower]) return CITY_TO_IATA[lower];

  // Partial match
  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (city.startsWith(lower) && lower.length >= 3) return code;
  }

  return null;
}

/** Parse a date string from natural language */
function parseDate(text: string): string | undefined {
  const parts = text.toLowerCase().trim().split(/\s+/);

  // "15 июля" or "15 июля 2026"
  const dayMonthMatch = text.match(/(\d{1,2})\s+(\S+)(?:\s+(\d{4}))?/);
  if (dayMonthMatch) {
    const day = dayMonthMatch[1].padStart(2, '0');
    const monthStr = dayMonthMatch[2].toLowerCase();
    if (MONTHS[monthStr]) {
      const year = dayMonthMatch[3] || new Date().getFullYear().toString();
      return `${year}-${MONTHS[monthStr]}-${day}`;
    }
  }

  // Single month name
  for (const part of parts) {
    if (MONTHS[part]) {
      const year = new Date().getFullYear();
      return `${year}-${MONTHS[part]}-15`;
    }
  }

  // DD.MM or DD.MM.YYYY
  const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3] || new Date().getFullYear().toString();
    return `${year}-${month}-${day}`;
  }

  return undefined;
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
        '/search SVO AER 15.07\n' +
        '/search из Питера в Краснодар на август\n\n' +
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
    await ctx.reply(
      'Не удалось распознать запрос.\n\n' +
      'Попробуйте:\n' +
      '- Москва Сочи июль\n' +
      '- из Питера в Краснодар 15 августа\n' +
      '- SVO AER 15.07'
    );
    return;
  }

  await ctx.reply(`Ищу рейсы ${parsed.origin} \u2192 ${parsed.destination}${parsed.date ? ` на ${parsed.date}` : ''}...`);

  try {
    const response = await apiClient.get('/search/flights', {
      params: {
        origin: parsed.origin,
        destination: parsed.destination,
        departure_date: parsed.date || getDefaultSearchDate(),
      },
    });

    const flights = response.data?.flights;

    if (!flights || flights.length === 0) {
      await ctx.reply(
        'Рейсы не найдены.\n' +
        'Попробуйте другие даты или маршруты.'
      );
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

    if (flights.length > 5) {
      await ctx.reply(
        `Показаны 5 из ${flights.length} рейсов.\n` +
        `Для просмотра всех результатов посетите hopperru.ru`
      );
    }
  } catch (err) {
    console.error('[bot] Search error:', err);
    await ctx.reply('Ошибка при поиске. Попробуйте позже.');
  }
}

/** Get a default search date (2 weeks from now) */
function getDefaultSearchDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
}
