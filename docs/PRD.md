# Product Requirements Document: HopperRU
**Версия:** 1.0 | **Дата:** 2026-05-12 | **Статус:** Draft

---

## 1. Vision

**HopperRU** (рабочее название) — первый в России AI-powered travel booking сервис с финтех-защитой путешественника. Мы превращаем бронирование из транзакции в финансовый продукт: предсказываем оптимальный момент покупки, замораживаем цены и гарантируем полный возврат при отмене.

> "Booking.com + AI-предиктор цен + финтех-страховка путешественника" — адаптированный для российского рынка.

**Источник модели:** Hopper ($850M revenue 2024, 70%+ от fintech-продуктов, 30%+ attach rate) — [Bloomberg](https://www.bloomberg.com/news/articles/2025-01-21/travel-app-hopper-eyes-long-term-ipo-plan-10-billion-valuation), [HTS](https://hts.hopper.com/)

---

## 2. Problem Statement

| Измерение | Без HopperRU | С HopperRU | Улучшение |
|-----------|-------------|------------|-----------|
| **Время** | Часы мониторинга цен на Aviasales, Yandex Travel, Google Flights | Web Push "Покупай сейчас" в нужный момент | 10x |
| **Деньги** | Переплата ₽5,000-20,000 за перелёт из-за неоптимального тайминга | AI предсказывает лучшую цену, экономия ~30-40% на волатильных маршрутах | ₽5,000-20,000/поездка |
| **Стресс** | Постоянная тревога "а вдруг подешевеет?" | Price Freeze замораживает цену, спокойствие на 21 день | Тревога -> Контроль |
| **Риск** | Невозвратные билеты, потеря денег при отмене | Cancel For Any Reason -> полный возврат | 0% -> 100% refund |

**Источник:** [Phase0_Product_Customers.md](Phase0_Product_Customers.md) Section B

---

## 3. Target Users

### Сегмент 1: "Тревожный экономист" (Budget-Anxious Millennial) — 45% базы

- **Кто:** 25-35 лет, доход ₽80,000-150,000/мес, городской, Москва/СПб/миллионники
- **JTBD:** "Когда я планирую поездку с ограниченным бюджетом, я хочу знать ТОЧНО когда покупать билет, чтобы не переплатить"
- **Текущее решение:** Aviasales + ручной мониторинг + десятки вкладок
- **Триггер:** Увидел цену ₽25,000 на рейс, который вчера стоил ₽18,000 -> FOMO + паника

### Сегмент 2: "Гибкий Gen Z-путешественник" — 30% базы

- **Кто:** 18-25 лет, доход <₽60,000/мес, mobile-first, web-native
- **JTBD:** "Хочу забронировать поездку с друзьями за 5 минут через PWA и иметь возможность отменить бесплатно"
- **Текущее решение:** Aviasales + TikTok travel hacks
- **Триггер:** Друг скинул deal в чат (VK/WhatsApp), внезапные каникулы, viral trip idea
- **Статистика:** 87% покупки со смартфона, 55% бронируют travel с мобильного, 66% меняли/отменяли планы за прошлый год — [Hopper Media](https://media.hopper.com/research/activating-gen-z-and-the-future-of-travel)

### Сегмент 3: "B2B Партнёр — Банк/Финтех" (Phase 2) — 25% revenue

- **Кто:** Product-менеджеры в банках (Тинькофф, Сбер, Альфа), финтехах
- **JTBD:** "Когда наш банк хочет повысить engagement карт, я хочу встроить travel booking в наше приложение без разработки с нуля"
- **Источник:** [Phase0_Product_Customers.md](Phase0_Product_Customers.md) Section D

---

## 4. Core Features (MVP)

### 4.1 Price Prediction AI

AI-алгоритм предсказывает оптимальный момент покупки авиабилета. Цветовой календарь показывает дешёвые и дорогие дни.

- **Phase 1 (MVP):** Rule-based engine, точность 70%, top-20 внутренних маршрутов РФ
- **Phase 2:** ML-модель на собственных данных, точность 85%+
- **Phase 3:** Big data, 95% точность (уровень Hopper — [FinanceBuzz](https://financebuzz.com/hopper-review))
- **Рекомендация:** "Buy Now" / "Wait N days" / "Price will rise" с объяснением

### 4.2 Price Freeze

Заморозка текущей цены на срок до 21 дня за фиксированную плату ₽2,000-3,000.

- Пользователь нашёл билет -> платит за заморозку -> бронирует в удобное время по зафиксированной цене
- Если цена упала — покупает по новой (более низкой) цене
- Если цена выросла — покупает по замороженной цене, HopperRU покрывает разницу
- **Источник модели:** Hopper Price Freeze — [Hopper Media](https://media.hopper.com/news/hopper-expands-fintech-across-verticals-offers-flexibility-before-and-during)

### 4.3 Cancel For Any Reason (CFAR)

Полный возврат стоимости билета при отмене по ЛЮБОЙ причине до момента вылета.

- Стоимость: ₽1,500-2,500 (% от стоимости билета)
- Реализация: через партнёра-страховщика (АльфаСтрахование/Ингосстрах) — [Phase0_Discovery_Brief.md](Phase0_Discovery_Brief.md) Section D
- **Регуляторный риск:** требуется лицензированный страховой партнёр (без собственной лицензии ЦБ)

### 4.4 Price Drop Protection

Мониторинг цены 10 дней после бронирования. Если цена упала — возврат разницы.

- Стоимость: ₽1,000-2,000
- Автоматический мониторинг через API авиакомпаний/агрегаторов
- **Источник:** [FinanceBuzz](https://financebuzz.com/hopper-review)

### 4.5 Telegram Bot

Основной канал взаимодействия (Telegram = 90M+ users RU — [Telegram](https://core.telegram.org/bots/payments)).

- Поиск рейсов по текстовым запросам ("Москва Стамбул июль")
- Price prediction inline
- Бронирование через Telegram Payments
- Push-уведомления: price alerts, prediction updates
- Viral mechника: "Я сэкономил ₽X" -> share в чаты

### 4.6 Web App

Полнофункциональное веб-приложение для расширенного поиска и управления бронированиями.

- Цветовой календарь цен
- Dashboard бронирований и защит
- Личный кабинет с историей

---

## 5. Feature Matrix: MVP / v1.0 / v2.0

| Feature | MVP (M1-3) | v1.0 (M4-9) | v2.0 (M12-24) |
|---------|:----------:|:-----------:|:-------------:|
| Поиск авиабилетов (domestic RU, top-20 маршрутов) | ✅ | ✅ | ✅ |
| Price Prediction (rule-based, 70% accuracy) | ✅ | ML 85% | Big Data 95% |
| Цветовой календарь цен | ✅ | ✅ | ✅ |
| Price Freeze | ✅ | ✅ | ✅ |
| Cancel For Any Reason | — | ✅ | ✅ |
| Price Drop Protection | — | ✅ | ✅ |
| Flight Disruption Guarantee | — | — | ✅ |
| Telegram Bot | ✅ | ✅ | ✅ |
| Web App (базовый) | ✅ | ✅ | ✅ |
| Telegram Payments (MIR/SBP) | ✅ | ✅ | ✅ |
| Push-уведомления / Price Alerts | ✅ | ✅ | ✅ |
| Отели | — | ✅ | ✅ |
| Поезда (РЖД/Сапсан) | — | ✅ | ✅ |
| Международные рейсы (расширение) | — | — | ✅ |
| B2B White-Label (HTS-модель) | — | — | ✅ |
| Цифровой рубль | — | — | ✅ |
| Agentic AI (автономные агенты) | — | — | ✅ |
| Carrot Cash (кэшбэк-система) | — | ✅ | ✅ |
| Corporate travel | — | — | ✅ |

---

## 6. Success Metrics (KPIs)

### Product KPIs

| Метрика | M3 | M6 | M12 | Источник бенчмарка |
|---------|:--:|:--:|:---:|---------------------|
| Total Users | 5K | 25K | 200K | [Phase0_Discovery_Brief.md](Phase0_Discovery_Brief.md) M4.C |
| Paying Users | 50 | 500 | 8K | |
| Fintech Attach Rate | 5% | 15% | 25% | Hopper: 30%+ — [HTS](https://hts.hopper.com/) |
| MRR | ₽125K | ₽1.25M | ₽20M | |
| D7 Retention | >30% | >35% | >40% | |
| Price Prediction Accuracy | 70% | 75% | 85% | Hopper: 95% — [FinanceBuzz](https://financebuzz.com/hopper-review) |

### Business KPIs

| Метрика | Target | Benchmark |
|---------|--------|-----------|
| ARPU (annual) | ₽2,500 ($28) | Hopper: ~$24 — [BusinessOfApps](https://www.businessofapps.com/data/hopper-statistics/) |
| Fintech ARPU per order | ₽3,500 ($39) | Hopper: $25-55 — [HTS](https://hts.hopper.com/) |
| CAC (Telegram) | ₽50-100 | US CPI: $3-6 — [ProtectGroup](https://www.protect.group/blog/the-online-travel-agency-landscape-now-and-into-2026) |
| LTV:CAC | >4:1 | Industry: 3:1-6:1 |
| Gross Margin (blended) | 55% | OTA: 85-90%, Fintech: 50%+ |
| Sean Ellis Score (M3) | >40% | PMF threshold |

### Kill Criteria

| Момент | Kill если | Почему |
|--------|----------|--------|
| Неделя 2 | <5/20 confirm problem in CustDev | Нет боли |
| Неделя 4 | <3% Telegram bot -> booking | Value prop не резонирует |
| Месяц 2 | 0/50 beta return D7 | Продукт не создаёт привычку |
| Месяц 3 | <₽50K MRR и <20 paying | No willingness to pay |
| Месяц 3 | Sean Ellis <20% | No PMF |

**Источник:** [Phase0_Discovery_Brief.md](Phase0_Discovery_Brief.md) Section E

---

## 7. MVP Scope: User Stories

### Epic 1: Price Search & Prediction

- **US-1:** Как пользователь, я хочу найти авиабилеты по маршруту и датам, чтобы увидеть текущие цены
- **US-2:** Как пользователь, я хочу видеть AI-рекомендацию "Купить сейчас" или "Подождать N дней", чтобы не переплатить
- **US-3:** Как пользователь, я хочу видеть цветовой календарь цен, чтобы выбрать самые дешёвые даты

### Epic 2: Price Freeze

- **US-4:** Как пользователь, я хочу заморозить цену на билет за ₽2,000-3,000 на 21 день, чтобы купить позже по этой цене
- **US-5:** Как пользователь, я хочу видеть статус моих заморозок и оставшееся время

### Epic 3: Telegram Bot

- **US-6:** Как пользователь, я хочу найти билеты через Telegram бот текстовым запросом
- **US-7:** Как пользователь, я хочу получать price alerts в Telegram, когда цена на мой маршрут изменилась
- **US-8:** Как пользователь, я хочу забронировать билет и оплатить через Telegram Payments

### Epic 4: Web App

- **US-9:** Как пользователь, я хочу видеть dashboard моих бронирований и защит в web-приложении
- **US-10:** Как пользователь, я хочу зарегистрироваться / войти через Telegram OAuth или email

---

## 8. Revenue Model

**Тип:** Marketplace + Fintech Hybrid

| Stream | Механика | Revenue per Unit | Target Margin |
|--------|----------|:----------------:|:-------------:|
| Booking commission (flights) | 3-5% от авиакомпаний | ₽700-1,500 | 85%+ |
| Booking commission (hotels, v1.0) | 15-25% от отелей | ₽1,500-4,000 | 85%+ |
| **Price Freeze** | Фиксированная плата за заморозку на 21 день | ₽2,000-3,000 | **50%+** |
| **Cancel For Any Reason** (v1.0) | % от стоимости билета | ₽1,500-2,500 | **50%+** |
| **Price Drop Protection** (v1.0) | Фиксированная плата, мониторинг 10 дней | ₽1,000-2,000 | **60%+** |
| Flight Disruption Guarantee (v2.0) | Страховая модель | ₽1,500-2,500 | **40%+** |
| B2B White-Label (v2.0) | Revenue share 15-25% от fintech products | Setup + ongoing | **70%+** |

**Ключевой insight:** У Hopper 70%+ revenue от fintech-продуктов, а не от комиссий. Наша стратегия идентична — booking комиссии покрывают базу, fintech-продукты создают маржу и moat.

**Источник:** [Phase0_Discovery_Brief.md](Phase0_Discovery_Brief.md) M4.A

---

## 9. Competitive Advantages

| # | Преимущество | Описание | Время до копирования |
|---|-------------|----------|:--------------------:|
| 1 | **Fintech Protection Bundle** | Price Freeze + CFAR + Price Drop — ни один российский конкурент не предлагает. TRIZ IFR: "бронирование без финансового риска" | 6-12 мес (нужен страховой партнёр) |
| 2 | **AI Price Prediction** | Ни один RU-игрок не делает предсказание будущих цен. Aviasales = metasearch текущих. Yandex Travel = OTA без AI | 12-18 мес (нужны данные) |
| 3 | **Telegram-First** | Единственный travel-fintech сервис, нативный для Telegram (90M+ пользователей в РФ) | 3-6 мес |
| 4 | **Data Moat** | Чем больше searches/bookings -> точнее predictions -> больше value -> больше users | 18+ мес (накопительный) |
| 5 | **Premium Fintech Positioning** | Nash Equilibrium: Premium Fintech Only -> лучший исход (меньше давления от Yandex, выше маржа) | Стратегический |

**Blue Ocean:** Ни один конкурент (Aviasales, Yandex Travel, OneTwoTrip, Tutu, Ostrovok) не предлагает AI prediction, Price Freeze, CFAR или Price Drop Protection — [Phase0_Discovery_Brief.md](Phase0_Discovery_Brief.md) M3.B

---

## 10. Architecture Constraints

| Параметр | Значение |
|----------|----------|
| Pattern | Distributed Monolith (Monorepo) |
| Containers | Docker + Docker Compose |
| Infrastructure | VPS (AdminVPS/HOSTKEY) |
| Deploy | Docker Compose direct deploy |
| AI Integration | MCP servers |
| Data Residency | Серверы в РФ (152-ФЗ) |
| Payments | MIR, SBP, YooKassa, Telegram Payments |
| Primary Channel | Telegram Bot API |

---

## 11. Regulatory Requirements

| Регуляция | Требование | Приоритет |
|-----------|-----------|:---------:|
| 152-ФЗ (персональные данные) | Серверы ОБЯЗАТЕЛЬНО в РФ, ужесточение 01.07.2025 | P0 (MVP) |
| Страхование (CFAR) | Партнёр-страховщик с лицензией ЦБ | P1 (v1.0) |
| MIR / SBP | Обязательная поддержка российских платёжных систем | P0 (MVP) |
| Цифровой рубль | Mandatory с 01.09.2026 | P2 (v2.0) |
| Лицензия турагента | Не требуется для OTA | Информационно |
| Финансовая гарантия ТО | Нужна если продаём пакетные туры | P2 (v2.0) |

**Источник:** [Phase0_Discovery_Brief.md](Phase0_Discovery_Brief.md) M3.E

---

## Appendix A: Phase 0 Sources

- [Phase0_Fact_Sheet.md](Phase0_Fact_Sheet.md) — Hopper company & product data
- [Phase0_Product_Customers.md](Phase0_Product_Customers.md) — Customer segments, JTBD, Voice of Customer
- [Phase0_Discovery_Brief.md](Phase0_Discovery_Brief.md) — Market, competition, business model, launch playbook
