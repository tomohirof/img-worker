'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: ログイン処理を実装
    console.log('Login:', { email, password });
    // 仮のログイン成功後の遷移
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg">
              <span className="text-2xl font-bold">??</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">img-worker-templates</h1>
          <p className="text-muted-foreground mt-1">アカウントにログイン</p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                メールアドレス
              </label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                パスワード
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded h-4 w-4" />
                <span className="text-muted-foreground">ログイン状態を保持</span>
              </label>
              <a href="#" className="text-primary hover:underline">
                パスワードを忘れた場合
              </a>
            </div>

            <Button type="submit" className="w-full" size="lg">
              ログイン
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            アカウントをお持ちでない方は{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              新規登録
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ログインすることで、利用規約とプライバシーポリシーに同意したことになります
        </p>
      </div>
    </div>
  );
}
