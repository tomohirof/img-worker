'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // 認証済みの場合、ダッシュボードへリダイレクト
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // 認証チェック中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 認証済みの場合、リダイレクト中
  if (user) {
    return null;
  }

  // 未認証の場合、ランディングページを表示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-4">OGP画像生成サービス</h1>
        <p className="text-gray-600 text-center mb-8">
          動的にOGP画像を生成するサービスです
        </p>
        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/register"
            className="block w-full py-3 px-4 bg-gray-200 text-gray-800 text-center rounded-md hover:bg-gray-300 transition-colors"
          >
            新規登録
          </Link>
        </div>
      </div>
    </div>
  );
}
