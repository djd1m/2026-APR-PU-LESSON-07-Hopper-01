'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, refreshTokens, getAccessToken } from '../lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side auth guard component.
 * Wraps protected pages — redirects to /auth if user is not authenticated.
 * Attempts token refresh before redirecting.
 */
export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    async function checkAuth() {
      if (isAuthenticated()) {
        setStatus('authenticated');
        return;
      }

      // Attempt to refresh tokens
      const newToken = await refreshTokens();
      if (newToken) {
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
        router.replace('/auth');
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

  if (status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}
