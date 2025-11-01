'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('パスワードが一致しません');
      return;
    }

    // TODO: 登録処理を実装
    console.log('Register:', { name, email, password });
    // 仮の登録成功後の遷移
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg">
              <span className="text-2xl font-bold">??</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">img-worker-templates</h1>
          <p className="text-muted-foreground mt-1">新規アカウント作成</p>
        </div>

        {/* Register Form */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                氏名 <span className="text-red-600">*</span>
              </label>
              <Input
                type="text"
                placeholder="山田 太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                メールアドレス <span className="text-red-600">*</span>
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
                パスワード <span className="text-red-600">*</span>
              </label>
              <Input
                type="password"
                placeholder="8文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                8文字以上の英数字を組み合わせてください
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                パスワード（確認） <span className="text-red-600">*</span>
              </label>
              <Input
                type="password"
                placeholder="パスワードを再入力"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" className="rounded h-4 w-4 mt-0.5" required />
              <label className="text-sm text-muted-foreground">
                <a href="#" className="text-primary hover:underline">利用規約</a>
                と
                <a href="#" className="text-primary hover:underline">プライバシーポリシー</a>
                に同意します
              </label>
            </div>

            <Button type="submit" className="w-full" size="lg">
              アカウント作成
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
