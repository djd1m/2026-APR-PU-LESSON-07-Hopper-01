import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../bot';
import { apiClient } from '../services/api-client';
import { formatPrice } from '../utils/formatters';

export function registerCallbackHandler(bot: Telegraf<BotContext>): void {
  // Select a flight for booking
  bot.action(/^select_flight:(.+)$/, async (ctx) => {
    const flightId = ctx.match[1];
    await ctx.answerCbQuery();

    try {
      const response = await apiClient.get(`/flights/${flightId}`);
      const flight = response.data;

      const message =
        `*Бронирование рейса*\n\n` +
        `${flight.origin} → ${flight.destination}\n` +
        `${flight.airline} ${flight.flight_number}\n` +
        `Вылет: ${flight.departure_at}\n` +
        `Цена: ${formatPrice(flight.price)}\n\n` +
        `Выберите дополнительную защиту:`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(
          `Заморозка цены (${formatPrice(2500)})`,
          `add_protection:${flightId}:PRICE_FREEZE`
        )],
        [Markup.button.callback(
          `Отмена по любой причине (${formatPrice(Math.round(flight.price * 0.05))})`,
          `add_protection:${flightId}:CFAR`
        )],
        [Markup.button.callback(
          `Защита от падения цены (${formatPrice(Math.round(flight.price * 0.03))})`,
          `add_protection:${flightId}:PRICE_DROP`
        )],
        [Markup.button.callback(
          'Продолжить без защиты',
          `confirm_booking:${flightId}:none`
        )],
      ]);

      await ctx.editMessageText(message, { parse_mode: 'Markdown', ...buttons });
    } catch (err) {
      console.error('[bot] Select flight error:', err);
      await ctx.reply('Ошибка при загрузке рейса. Попробуйте снова.');
    }
  });

  // Add protection to booking
  bot.action(/^add_protection:(.+):(.+)$/, async (ctx) => {
    const flightId = ctx.match[1];
    const protectionType = ctx.match[2];
    await ctx.answerCbQuery(`${translateProtection(protectionType)} добавлена`);

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback(
        'Подтвердить бронирование',
        `confirm_booking:${flightId}:${protectionType}`
      )],
      [Markup.button.callback('Отмена', `cancel_booking:${flightId}`)],
    ]);

    await ctx.editMessageReplyMarkup(buttons.reply_markup);
  });

  // Confirm booking
  bot.action(/^confirm_booking:(.+):(.+)$/, async (ctx) => {
    const flightId = ctx.match[1];
    const protection = ctx.match[2];
    const telegramId = ctx.from!.id.toString();
    await ctx.answerCbQuery();

    try {
      const response = await apiClient.post('/bookings', {
        telegram_id: telegramId,
        flight_id: flightId,
        protection: protection !== 'none' ? protection : undefined,
      });

      const booking = response.data;

      await ctx.editMessageText(
        `*Бронирование создано!* ✈️\n\n` +
        `Номер: ${booking.id}\n` +
        `Статус: Ожидает оплаты\n\n` +
        `Для оплаты перейдите по ссылке:\n${booking.payment_url || 'TODO: payment URL'}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[bot] Booking error:', err);
      await ctx.reply('Ошибка при создании бронирования. Попробуйте позже.');
    }
  });

  // Price freeze
  bot.action(/^freeze:(.+)$/, async (ctx) => {
    const flightId = ctx.match[1];
    const telegramId = ctx.from!.id.toString();
    await ctx.answerCbQuery();

    try {
      const response = await apiClient.post('/freeze', {
        telegram_id: telegramId,
        flight_id: flightId,
      });

      const freeze = response.data;
      await ctx.reply(
        `*Цена заморожена!* 🧊\n\n` +
        `Цена: ${formatPrice(freeze.frozen_price)}\n` +
        `Действует до: ${freeze.expires_at}\n` +
        `Комиссия: ${formatPrice(freeze.freeze_fee)}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[bot] Freeze error:', err);
      await ctx.reply('Ошибка при заморозке цены. Попробуйте позже.');
    }
  });

  // Price prediction
  bot.action(/^predict:(.+)$/, async (ctx) => {
    const flightId = ctx.match[1];
    await ctx.answerCbQuery();

    try {
      const response = await apiClient.get(`/predict/${flightId}`);
      const prediction = response.data;

      const actionEmoji =
        prediction.recommendation === 'BUY_NOW' ? '🟢' :
        prediction.recommendation === 'WAIT' ? '🟡' : '⚪';

      const actionText =
        prediction.recommendation === 'BUY_NOW' ? 'Купить сейчас' :
        prediction.recommendation === 'WAIT' ? 'Подождать' : 'Нет данных';

      let message =
        `*Прогноз цены* ${actionEmoji}\n\n` +
        `Рекомендация: *${actionText}*\n` +
        `Уверенность: ${Math.round(prediction.confidence * 100)}%\n`;

      if (prediction.predicted_change_pct) {
        message += `Ожидаемое изменение: ${prediction.predicted_change_pct > 0 ? '+' : ''}${prediction.predicted_change_pct}%\n`;
      }

      if (prediction.explanation) {
        message += `\n${prediction.explanation}`;
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[bot] Prediction error:', err);
      await ctx.reply('Ошибка при получении прогноза. Попробуйте позже.');
    }
  });

  // Delete alert
  bot.action(/^delete_alert:(.+)$/, async (ctx) => {
    const alertId = ctx.match[1];
    await ctx.answerCbQuery('Уведомление удалено');

    try {
      await apiClient.delete(`/alerts/${alertId}`);
      await ctx.editMessageText('Уведомление удалено.');
    } catch (err) {
      console.error('[bot] Delete alert error:', err);
      await ctx.reply('Ошибка при удалении уведомления.');
    }
  });

  // Cancel booking flow
  bot.action(/^cancel_booking:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('Отменено');
    await ctx.editMessageText('Бронирование отменено.');
  });
}

function translateProtection(type: string): string {
  const map: Record<string, string> = {
    PRICE_FREEZE: 'Заморозка цены',
    CFAR: 'Отмена по любой причине',
    PRICE_DROP: 'Защита от падения цены',
  };
  return map[type] || type;
}
