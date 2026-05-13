'use client';

import { useEffect, useState } from 'react';

export default function AuthButton() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hopperru_access_token');
    setLoggedIn(!!token);

    // Re-check when storage changes (e.g. after login in another tab)
    const handler = () => {
      setLoggedIn(!!localStorage.getItem('hopperru_access_token'));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (loggedIn) {
    return (
      <a
        href="/logout"
        className="text-sm text-gray-600 hover:text-red-500 transition-colors"
      >
        Выйти
      </a>
    );
  }

  return (
    <a href="/auth" className="btn-primary text-sm inline-block">
      Войти
    </a>
  );
}
