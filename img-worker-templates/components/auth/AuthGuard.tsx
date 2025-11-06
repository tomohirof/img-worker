'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // localStorageからトークンを取得
    const token = localStorage.getItem('__session');

    if (!token) {
      // トークンがない場合、ログインページにリダイレクト
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // 認証済み
    setIsAuthenticated(true);
  }, [router, pathname]);

  // 認証チェック中
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 認証済み
  return <>{children}</>;
}
