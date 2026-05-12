import { Telegraf, Context, session } from 'telegraf';
import { registerStartCommand } from './commands/start';
import { registerSearchCommand } from './commands/search';
import { registerAlertsCommand } from './commands/alerts';
import { registerBookingsCommand } from './commands/bookings';
import { registerCallbackHandler } from './handlers/callback';

export interface BotContext extends Context {
  session: {
    searchState?: {
      origin?: string;
      destination?: string;
      date?: string;
    };
  };
}

const RATE_LIMIT_WINDOW_MS = 1000;
const rateLimitMap = new Map<number, number>();

/**
 * Rate limiting middleware: 1 message per second per user.
 */
function rateLimitMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const lastMessage = rateLimitMap.get(userId) || 0;

  if (now - lastMessage < RATE_LIMIT_WINDOW_MS) {
    return Promise.resolve(); // silently drop
  }

  rateLimitMap.set(userId, now);
  return next();
}

/**
 * Global error handler middleware.
 */
function errorHandler(err: unknown, ctx: BotContext): void {
  const userId = ctx.from?.id ?? 'unknown';
  console.error(`[bot] Error for user ${userId}:`, err);

  ctx.reply('Произошла ошибка. Попробуйте позже.').catch(() => {
    // If reply fails, nothing we can do
  });
}

/**
 * Create and configure the bot instance.
 */
export function createBot(token: string): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(token);

  // Session middleware (in-memory, stateless across restarts)
  bot.use(session({ defaultSession: () => ({ searchState: undefined }) }));

  // Rate limiting
  bot.use(rateLimitMiddleware);

  // Register command handlers
  registerStartCommand(bot);
  registerSearchCommand(bot);
  registerAlertsCommand(bot);
  registerBookingsCommand(bot);

  // Register inline button callback handler
  registerCallbackHandler(bot);

  // Global error handler
  bot.catch(errorHandler);

  return bot;
}
