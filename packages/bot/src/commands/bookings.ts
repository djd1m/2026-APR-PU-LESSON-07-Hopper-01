import { Telegraf } from 'telegraf';
import { BotContext } from '../bot';
import { apiClient } from '../services/api-client';
import { formatPrice, formatDate } from '../utils/formatters';

export function registerBookingsCommand(bot: Telegraf<BotContext>): void {
  bot.command('bookings', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    try {
      const response = await apiClient.get('/bookings', {
        params: { telegram_id: telegramId },
      });

      const bookings = response.data.bookings;

      if (!bookings || bookings.length === 0) {
        await ctx.reply(
          'У вас нет активных бронирований.\n\n' +
          'Найдите рейс через /search и забронируйте!'
        );
        return;
      }

      let message = '*Ваши бронирования:*\n\n';

      for (const booking of bookings) {
        const statusEmoji = getStatusEmoji(booking.status);
        message +=
          `${statusEmoji} *${booking.origin} → ${booking.destination}*\n` +
          `Рейс: ${booking.flight_number}\n` +
          `Дата: ${formatDate(booking.departure_at)}\n` +
          `Статус: ${translateStatus(booking.status)}\n` +
          `Цена: ${formatPrice(booking.total_price)}\n`;

        if (booking.protections && booking.protections.length > 0) {
          message += `Защита: ${booking.protections.map((p: { type: string }) => translateProtection(p.type)).join(', ')}\n`;
        }

        message += '\n';
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[bot] Bookings error:', err);
      await ctx.reply('Ошибка при загрузке бронирований. Попробуйте позже.');
    }
  });
}

function getStatusEmoji(status: string): string {
  const map: Record<string, string> = {
    PENDING: '🟡',
    CONFIRMED: '🟢',
    TICKETED: '🟢',
    CHECKED_IN: '✈️',
    COMPLETED: '✅',
    CANCELLED: '🔴',
    REFUNDED: '↩️',
  };
  return map[status] || '⚪';
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Ожидает оплаты',
    CONFIRMED: 'Подтверждено',
    TICKETED: 'Билет выписан',
    CHECKED_IN: 'Регистрация пройдена',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
    REFUNDED: 'Возврат',
  };
  return map[status] || status;
}

function translateProtection(type: string): string {
  const map: Record<string, string> = {
    PRICE_FREEZE: 'Заморозка цены',
    CANCEL_FOR_ANY_REASON: 'Отмена по любой причине',
    PRICE_DROP: 'Защита от падения цены',
    FLIGHT_DISRUPTION: 'Защита от задержки рейса',
  };
  return map[type] || type;
}
