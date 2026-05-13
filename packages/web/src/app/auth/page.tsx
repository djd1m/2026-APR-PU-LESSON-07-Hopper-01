'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { register, verify, isAuthenticated } from '../../lib/auth';

type Step = 'phone' | 'code';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus code input when switching to code step
  useEffect(() => {
    if (step === 'code') {
      codeInputRef.current?.focus();
    }
  }, [step]);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(phone, name);
      setStep('code');
      setCountdown(60);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ошибка при отправке кода';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verify(phone, code);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ошибка при проверке кода';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setError('');
    setLoading(true);

    try {
      await register(phone, name);
      setCountdown(60);
      setCode('');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ошибка при повторной отправке';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'phone' ? 'Вход в HopperRU' : 'Введите код'}
          </h1>
          <p className="text-gray-500 mt-2">
            {step === 'phone'
              ? 'Авиабилеты с AI-прогнозом цен'
              : `Код отправлен на ${phone}`}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Phone + Name */}
        {step === 'phone' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ваше имя
              </label>
              <input
                id="name"
                type="text"
                className="input-field"
                placeholder="Иван Иванов"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Номер телефона
              </label>
              <input
                id="phone"
                type="tel"
                className="input-field"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || !phone.trim() || !name.trim()}
            >
              {loading ? 'Отправка...' : 'Получить код'}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">
              Нажимая кнопку, вы соглашаетесь с условиями использования и
              политикой конфиденциальности (152-ФЗ)
            </p>
          </form>
        )}

        {/* Step 2: SMS Code */}
        {step === 'code' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Код из SMS
              </label>
              <input
                ref={codeInputRef}
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="------"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(val);
                }}
                required
                maxLength={6}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Изменить номер
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className={`${
                  countdown > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-primary-500 hover:text-primary-600'
                }`}
              >
                {countdown > 0
                  ? `Отправить снова (${countdown}с)`
                  : 'Отправить снова'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
