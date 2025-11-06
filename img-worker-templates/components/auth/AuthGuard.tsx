'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_CONFIG } from '@/lib/config';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // localStorageからトークンを取得
      const token = localStorage.getItem('__session');

      if (!token) {
        // トークンがない場合、ログインページにリダイレクト
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // サーバーでトークンを検証
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/session`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (response.ok) {
          // 認証成功
          setIsAuthenticated(true);
        } else {
          // トークンが無効
          localStorage.removeItem('__session');
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // エラー時もログインページにリダイレクト
        localStorage.removeItem('__session');
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    };

    checkAuth();
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
