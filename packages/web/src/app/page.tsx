'use client';

import { SearchForm } from '@/components/SearchForm';

export default function HomePage() {
  return (
    <div>
      {/* Hero section */}
      <section className="bg-gradient-to-br from-primary-500 to-primary-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Летайте дешевле с ИИ
            </h1>
            <p className="text-xl text-primary-100">
              HopperRU предскажет, когда цена снизится, и защитит вашу покупку финтех-инструментами.
            </p>
          </div>

          {/* Search form */}
          <div className="max-w-4xl mx-auto">
            <SearchForm />
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Почему HopperRU?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: AI Prediction */}
            <div className="card text-center">
              <div className="w-16 h-16 bg-prediction-buy/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-prediction-buy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">ИИ-прогноз цен</h3>
              <p className="text-gray-600">
                Наш алгоритм анализирует сезонность, день недели, историю цен и подсказывает: купить сейчас или подождать.
              </p>
            </div>

            {/* Card 2: Fintech Protection */}
            <div className="card text-center">
              <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Финтех-защита</h3>
              <p className="text-gray-600">
                Заморозка цены, отмена по любой причине, защита от падения цены. Путешествуйте без рисков.
              </p>
            </div>

            {/* Card 3: Savings */}
            <div className="card text-center">
              <div className="w-16 h-16 bg-sunset/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-sunset" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Экономия до 30%</h3>
              <p className="text-gray-600">
                Пользователи экономят в среднем 15% на авиабилетах, следуя рекомендациям нашего ИИ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            Начните экономить прямо сейчас
          </h2>
          <p className="text-gray-600 mb-8">
            Также доступен в Telegram — попробуйте @HopperRU_bot
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/search" className="btn-primary text-center">
              Найти рейс
            </a>
            <a
              href="https://t.me/HopperRU_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-center"
            >
              Открыть в Telegram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
