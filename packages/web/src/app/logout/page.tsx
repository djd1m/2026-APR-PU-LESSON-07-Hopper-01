'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all auth data
    localStorage.removeItem('hopperru_access_token');
    localStorage.removeItem('hopperru_refresh_token');
    localStorage.removeItem('hopperru_user');
    // Redirect to auth
    router.replace('/auth');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-gray-500">Выход из аккаунта...</p>
    </div>
  );
}
