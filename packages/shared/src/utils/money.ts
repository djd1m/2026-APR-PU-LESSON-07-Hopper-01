/** Structured money value with amount in minor units (kopecks) */
export interface Money {
  /** Amount in minor units (kopecks for RUB, cents for USD/EUR) */
  readonly amount: number;
  readonly currency: string;
}

const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  RUB: '\u20BD',
  USD: '$',
  EUR: '\u20AC',
};

const MINOR_UNIT_DIVISOR = 100;

/**
 * Format a kopeck amount as a human-readable RUB string.
 * @example formatRUB(1234500) => "12 345,00 ₽"
 */
export function formatRUB(kopecks: number): string {
  const rubles = kopecks / MINOR_UNIT_DIVISOR;
  const formatted = rubles
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ${CURRENCY_SYMBOLS.RUB}`;
}

/**
 * Parse a Money object into a display string.
 * @example parseMoney({ amount: 500000, currency: 'RUB' }) => "5 000,00 ₽"
 */
export function parseMoney(money: Money): string {
  const major = money.amount / MINOR_UNIT_DIVISOR;
  const symbol = CURRENCY_SYMBOLS[money.currency] ?? money.currency;

  if (money.currency === 'RUB') {
    const formatted = major
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} ${symbol}`;
  }

  const formatted = major
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${formatted}`;
}
