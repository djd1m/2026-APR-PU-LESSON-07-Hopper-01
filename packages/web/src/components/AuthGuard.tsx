'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, refreshTokens, clearAuth } from '../lib/auth';
import { apiClient } from '../lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side auth guard.
 * Validates token against API, redirects to /auth if invalid.
 */
export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    async function checkAuth() {
      if (!isAuthenticated()) {
        // No token at all → try refresh
        const newToken = await refreshTokens();
        if (!newToken) {
          setStatus('unauthenticated');
          router.replace('/auth');
          return;
        }
      }

      // Token exists — validate it against API
      try {
        await apiClient('/auth/me');
        setStatus('authenticated');
      } catch {
        // Token invalid/expired — try refresh once
        const newToken = await refreshTokens();
        if (newToken) {
          setStatus('authenticated');
        } else {
          clearAuth();
          setStatus('unauthenticated');
          router.replace('/auth');
        }
      }
    }

    checkAuth();
  }, [router]);

  if (status === 'loading') {
    return (
      fallback ?? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-500 text-lg">Проверка авторизации...</div>
        </div>
      )
    );
  }

  if (status === 'unauthenticated') return null;

  return <>{children}</>;
}
