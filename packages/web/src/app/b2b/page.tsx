'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

const PARTNER_TYPES = [
  { value: 'bank', label: 'Банк', description: 'Встройте защиту путешественника в ваше банковское приложение' },
  { value: 'airline', label: 'Авиакомпания', description: 'Добавьте AI-прогнозы и финтех-защиту к продаже билетов' },
  { value: 'travel_agency', label: 'Турагентство', description: 'Повысьте конверсию с предиктивным ценообразованием' },
  { value: 'insurance', label: 'Страховая', description: 'Предложите инновационные продукты: CFAR, PriceDrop, Disruption' },
  { value: 'other', label: 'Другое', description: 'Индивидуальная интеграция под ваш бизнес' },
] as const;

const FEATURES = [
  {
    title: 'AI-Прогноз цен',
    description: 'Рекомендации "Купить/Ждать" с точностью до 85%. Увеличивает доверие пользователей.',
    metric: '+23% конверсия',
  },
  {
    title: 'Заморозка цены',
    description: 'Фиксация текущей цены на 21 день. Дополнительная монетизация: комиссия 2-3K RUB.',
    metric: '15% attach rate',
  },
  {
    title: 'CFAR Protection',
    description: 'Отмена по любой причине с полным возвратом. Страховой продукт через лицензированного партнёра.',
    metric: '12% attach rate',
  },
  {
    title: 'Price Drop',
    description: 'Мониторинг цены 10 дней, автовозврат разницы. Уникальное УТП на российском рынке.',
    metric: '8% attach rate',
  },
  {
    title: 'White-Label SDK',
    description: 'Полностью брендированный виджет: ваши цвета, логотип, домен. Интеграция за 1 день.',
    metric: '< 1 день',
  },
  {
    title: 'Revenue Share',
    description: 'До 25% от выручки по защитным продуктам. Прозрачная аналитика в реальном времени.',
    metric: 'до 25%',
  },
];

export default function B2BLandingPage() {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    partner_type: 'bank' as string,
    website: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient('/b2b/partners', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSubmitted(true);
    } catch {
      setError('Ошибка при отправке. Попробуйте позже или напишите на b2b@hopperru.ru');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              HopperRU B2B Platform
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Встройте AI-прогнозы цен и финтех-защиту путешественника
              в ваш продукт. White-label решение для банков, авиакомпаний
              и турагентств.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#register"
                className="px-8 py-3 rounded-lg bg-white text-primary-700 font-semibold hover:bg-primary-50 transition-colors"
              >
                Стать партнёром
              </a>
              <a
                href="#features"
                className="px-8 py-3 rounded-lg border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Возможности
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-primary-600">850M+</p>
              <p className="text-sm text-gray-500 mt-1">Рынок travel-fintech (USD)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary-600">34%</p>
              <p className="text-sm text-gray-500 mt-1">Средний attach rate</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary-600">85%</p>
              <p className="text-sm text-gray-500 mt-1">Точность прогнозов</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary-600">1 день</p>
              <p className="text-sm text-gray-500 mt-1">Интеграция SDK</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Что вы получаете
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 font-medium whitespace-nowrap">
                    {feature.metric}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partner types */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Для кого
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PARTNER_TYPES.map((type) => (
              <div
                key={type.value}
                className="border rounded-xl p-4 text-center hover:border-primary-300 transition-colors"
              >
                <h3 className="font-semibold mb-2">{type.label}</h3>
                <p className="text-xs text-gray-500">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration form */}
      <div id="register" className="bg-gray-50 py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">
            Стать партнёром
          </h2>

          {submitted ? (
            <div className="card text-center py-12">
              <p className="text-2xl font-bold text-green-600 mb-4">Заявка отправлена!</p>
              <p className="text-gray-600">
                Мы свяжемся с вами в течение 24 часов для обсуждения интеграции.
                Проверьте почту &mdash; там будет ссылка на sandbox.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Компания *
                  </label>
                  <input
                    className="input-field"
                    value={formData.company_name}
                    onChange={(e) => setFormData((f) => ({ ...f, company_name: e.target.value }))}
                    placeholder="ООО Рога и Копыта"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип партнёра *
                  </label>
                  <select
                    className="input-field"
                    value={formData.partner_type}
                    onChange={(e) => setFormData((f) => ({ ...f, partner_type: e.target.value }))}
                  >
                    {PARTNER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Контактное лицо *
                  </label>
                  <input
                    className="input-field"
                    value={formData.contact_name}
                    onChange={(e) => setFormData((f) => ({ ...f, contact_name: e.target.value }))}
                    placeholder="Иван Иванов"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    className="input-field"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData((f) => ({ ...f, contact_email: e.target.value }))}
                    placeholder="ivan@company.ru"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сайт
                </label>
                <input
                  className="input-field"
                  value={formData.website}
                  onChange={(e) => setFormData((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://company.ru"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Опишите вашу задачу
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Хотим встроить прогноз цен в мобильное приложение банка..."
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full text-center py-3"
              >
                {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Или напишите напрямую: b2b@hopperru.ru
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
