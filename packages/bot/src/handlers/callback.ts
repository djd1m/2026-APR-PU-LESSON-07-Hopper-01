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
      const response = await apiClient.get(`/search/flights/${flightId}`);
      const flight = response.data;

      const cfarPrice = Math.round(flight.price * 0.05);
      const priceDropPrice = Math.round(flight.price * 0.03);
      const bundlePrice = Math.round((cfarPrice + priceDropPrice) * 0.81);

      const message =
        `*Бронирование рейса*\n\n` +
        `${flight.origin} \u2192 ${flight.destination}\n` +
        `${flight.airline_name || flight.airline} ${flight.flight_number}\n` +
        `Вылет: ${new Date(flight.departure_at).toLocaleString('ru-RU')}\n` +
        `Цена: *${formatPrice(flight.price)}*\n\n` +
        `Выберите защиту:`;

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(
          `Заморозка цены (${formatPrice(2500)})`,
          `add_protection:${flightId}:PRICE_FREEZE`
        )],
        [Markup.button.callback(
          `CFAR — отмена по любой причине (${formatPrice(cfarPrice)})`,
          `add_protection:${flightId}:CFAR`
        )],
        [Markup.button.callback(
          `Защита от падения цены (${formatPrice(priceDropPrice)})`,
          `add_protection:${flightId}:PRICE_DROP`
        )],
        [Markup.button.callback(
          `Bundle: CFAR + PriceDrop -19% (${formatPrice(bundlePrice)})`,
          `add_bundle:${flightId}`
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

  // Add bundle protection (CFAR + PriceDrop at 19% discount)
  bot.action(/^add_bundle:(.+)$/, async (ctx) => {
    const flightId = ctx.match[1];
    await ctx.answerCbQuery('Комплект CFAR + PriceDrop добавлен (-19%)');

    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback(
        'Подтвердить бронирование',
        `confirm_booking:${flightId}:CFAR_BUNDLE`
      )],
      [Markup.button.callback('Отмена', `cancel_booking:${flightId}`)],
    ]);

    await ctx.editMessageReplyMarkup(buttons.reply_markup);
  });

  // Add single protection to booking
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
      const protections: string[] = [];
      if (protection === 'CFAR_BUNDLE') {
        protections.push('cancel_for_any_reason', 'price_drop');
      } else if (protection !== 'none') {
        protections.push(protection);
      }

      const response = await apiClient.post('/bookings', {
        telegram_id: telegramId,
        flight_id: flightId,
        protections: protections.map((t) => ({ type: t })),
        payment_method: 'sbp',
      });

      const booking = response.data?.booking || response.data;

      const bundleNote = protection === 'CFAR_BUNDLE'
        ? '\nКомплект CFAR + PriceDrop со скидкой 19%'
        : '';

      await ctx.editMessageText(
        `*Бронирование создано!*\n\n` +
        `Номер: \`${booking.pnr || booking.id}\`\n` +
        `Статус: Ожидает оплаты${bundleNote}\n\n` +
        `Для оплаты перейдите:\n${booking.payment_url || 'https://hopperru.ru/pay/' + (booking.id || flightId)}`,
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
      const response = await apiClient.post('/api/freeze', {
        telegram_id: telegramId,
        flight_id: flightId,
      });

      const freeze = response.data?.freeze || response.data;
      const frozenPrice = freeze.frozen_price?.amount || freeze.frozen_price;
      const freezeFee = freeze.freeze_fee?.amount || freeze.freeze_fee;
      const expiresAt = freeze.expires_at
        ? new Date(freeze.expires_at).toLocaleDateString('ru-RU')
        : '21 день';

      await ctx.reply(
        `*Цена заморожена!*\n\n` +
        `Зафиксированная цена: ${formatPrice(frozenPrice)}\n` +
        `Действует до: ${expiresAt}\n` +
        `Комиссия: ${formatPrice(freezeFee)}\n\n` +
        `Вы можете забронировать по этой цене в любой момент.`,
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
      const response = await apiClient.get(`/prediction/${flightId}`);
      const prediction = response.data;

      const actionEmoji =
        prediction.recommendation === 'BUY_NOW' ? '\u{1F7E2}' :
        prediction.recommendation === 'WAIT' ? '\u{1F7E1}' : '\u26AA';

      const actionText =
        prediction.recommendation === 'BUY_NOW' ? 'Купить сейчас' :
        prediction.recommendation === 'WAIT' ? 'Подождать' : 'Нет данных';

      let message =
        `*Прогноз цены* ${actionEmoji}\n\n` +
        `Рекомендация: *${actionText}*\n` +
        `Уверенность: ${Math.round((prediction.confidence || 0) * 100)}%\n`;

      if (prediction.predicted_change_pct) {
        message += `Ожидаемое изменение: ${prediction.predicted_change_pct > 0 ? '+' : ''}${prediction.predicted_change_pct}%\n`;
      }

      if (prediction.explanation) {
        message += `\n${prediction.explanation}`;
      }

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('Заморозить цену', `freeze:${flightId}`)],
        [Markup.button.callback('Забронировать', `select_flight:${flightId}`)],
      ]);

      await ctx.reply(message, { parse_mode: 'Markdown', ...buttons });
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
      await apiClient.delete(`/user/alerts/${alertId}`);
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
    CFAR_BUNDLE: 'Комплект CFAR + PriceDrop',
  };
  return map[type] || type;
}
