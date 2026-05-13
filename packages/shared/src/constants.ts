/**
 * Top-20 Russian domestic airports by passenger traffic.
 * IATA code -> city name (Russian).
 */
export const SUPPORTED_AIRPORTS: Readonly<Record<string, string>> = {
  SVO: 'Москва (Шереметьево)',
  DME: 'Москва (Домодедово)',
  VKO: 'Москва (Внуково)',
  LED: 'Санкт-Петербург (Пулково)',
  AER: 'Сочи (Адлер)',
  KRR: 'Краснодар (Пашковский)',
  SVX: 'Екатеринбург (Кольцово)',
  OVB: 'Новосибирск (Толмачёво)',
  ROV: 'Ростов-на-Дону (Платов)',
  KZN: 'Казань',
  UFA: 'Уфа',
  VOG: 'Волгоград',
  KGD: 'Калининград (Храброво)',
  MRV: 'Минеральные Воды',
  AAQ: 'Анапа (Витязево)',
  IKT: 'Иркутск',
  KHV: 'Хабаровск',
  VVO: 'Владивосток',
  TJM: 'Тюмень (Рощино)',
  CEK: 'Челябинск (Баландино)',
  GOJ: 'Нижний Новгород (Стригино)',
  PEE: 'Пермь (Большое Савино)',
  GDZ: 'Геленджик',
  MCX: 'Махачкала',
  OGZ: 'Владикавказ',
  NBC: 'Набережные Челны (Бегишево)',
  KJA: 'Красноярск (Емельяново)',
  YKS: 'Якутск',
  PKC: 'Петропавловск-Камчатский',
  // Популярные международные
  IST: 'Стамбул',
  AYT: 'Анталья',
  DXB: 'Дубай',
  TBS: 'Тбилиси',
  EVN: 'Ереван',
  ALA: 'Алматы',
  TSE: 'Астана',
  TAS: 'Ташкент',
  BKK: 'Бангкок',
  MLE: 'Мальдивы (Мале)',
  HKT: 'Пхукет',
  GYD: 'Баку',
  CAN: 'Гуанчжоу',
  HRG: 'Хургада',
  SSH: 'Шарм-эш-Шейх',
} as const;

/** Supported Russian airlines. IATA code -> name. */
export const AIRLINES: Readonly<Record<string, string>> = {
  SU: 'Аэрофлот',
  S7: 'S7 Airlines',
  DP: 'Победа',
  U6: 'Уральские авиалинии',
  FV: 'Россия',
} as const;

/** Supported currencies */
export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const;

/** Maximum number of days a price freeze can be held */
export const PRICE_FREEZE_MAX_DAYS = 21;

/** Maximum number of active price alerts per user */
export const MAX_ALERTS_PER_USER = 10;
