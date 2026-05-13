'use client';

import { Inter } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 2,
          },
        },
      })
  );

  return (
    <html lang="ru">
      <head>
        <title>HopperRU — Умные авиабилеты</title>
        <meta name="description" content="AI-powered поиск авиабилетов с прогнозом цен и финтех-защитой" />
        <meta name="theme-color" content="#1878EC" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <header className="bg-white border-b border-gray-200">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <a href="/" className="text-2xl font-bold text-primary-500">
                HopperRU
              </a>
              <div className="flex items-center gap-6">
                <a href="/search" className="text-gray-600 hover:text-primary-500 transition-colors">
                  Поиск
                </a>
                <a href="/dashboard" className="text-gray-600 hover:text-primary-500 transition-colors">
                  Личный кабинет
                </a>
                <a href="/auth" className="btn-primary text-sm inline-block">Войти</a>
              </div>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="bg-gray-900 text-gray-400 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-white font-semibold mb-3">HopperRU</h3>
                  <p className="text-sm">AI-powered поиск авиабилетов для российского рынка.</p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-3">Ссылки</h3>
                  <ul className="text-sm space-y-2">
                    <li><a href="/search" className="hover:text-white transition-colors">Поиск рейсов</a></li>
                    <li><a href="/dashboard" className="hover:text-white transition-colors">Личный кабинет</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-3">Контакты</h3>
                  <p className="text-sm">Telegram: @HopperRU_bot</p>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
                &copy; {new Date().getFullYear()} HopperRU. Все права защищены.
              </div>
            </div>
          </footer>
        </QueryClientProvider>
      </body>
    </html>
  );
}
