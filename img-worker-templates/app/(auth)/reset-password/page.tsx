'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/password/reset/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'リクエストに失敗しました');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('リクエスト処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            OGP Generator
          </h1>
          <p className="text-gray-600 mt-2">パスワードをリセット</p>
        </div>

        {/* Reset Password Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">パスワードをリセット</h2>
            <p className="text-sm text-gray-600 mt-1">
              登録済みのメールアドレスを入力してください
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
                <p className="font-medium">メールを送信しました</p>
                <p className="text-sm mt-1">
                  メールアドレスが登録されている場合、パスワードリセット用のリンクを送信しました。メールをご確認ください。
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full text-center inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-gray-300 bg-white hover:bg-gray-100 h-11 px-8"
              >
                ログインページに戻る
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                >
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 h-11 px-8 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'リクエスト送信中...' : 'リセットリンクを送信'}
                {!loading && <ArrowRight className="h-[18px] w-[18px]" />}
              </button>
            </form>
          )}

          {/* Login Link */}
          {!success && (
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">パスワードを思い出しましたか？</span>
              <Link
                href="/login"
                className="text-blue-600 font-medium hover:underline ml-1"
              >
                ログイン
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>&copy; 2024 OGP Generator. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
