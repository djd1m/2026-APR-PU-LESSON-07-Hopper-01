import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../bot';
import { apiClient } from '../services/api-client';
import { formatPrice } from '../utils/formatters';

export function registerAlertsCommand(bot: Telegraf<BotContext>): void {
  bot.command('alerts', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    try {
      const response = await apiClient.get('/alerts', {
        params: { telegram_id: telegramId },
      });

      const alerts = response.data.alerts;

      if (!alerts || alerts.length === 0) {
        await ctx.reply(
          'У вас нет активных уведомлений.\n\n' +
          'Чтобы создать уведомление, найдите рейс через /search ' +
          'и нажмите "Отслеживать цену".'
        );
        return;
      }

      let message = '*Ваши ценовые уведомления:*\n\n';

      for (const alert of alerts) {
        message +=
          `${alert.origin} → ${alert.destination}\n` +
          `Дата: ${alert.departure_date}\n` +
          `Целевая цена: ${formatPrice(alert.target_price)}\n` +
          `Текущая цена: ${formatPrice(alert.current_price)}\n\n`;
      }

      const buttons = Markup.inlineKeyboard(
        alerts.map((alert: { id: string; origin: string; destination: string }) =>
          [Markup.button.callback(
            `Удалить: ${alert.origin}→${alert.destination}`,
            `delete_alert:${alert.id}`
          )]
        )
      );

      await ctx.reply(message, { parse_mode: 'Markdown', ...buttons });
    } catch (err) {
      console.error('[bot] Alerts error:', err);
      await ctx.reply('Ошибка при загрузке уведомлений. Попробуйте позже.');
    }
  });
}
