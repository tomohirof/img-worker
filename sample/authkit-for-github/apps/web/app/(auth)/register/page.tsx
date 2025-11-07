'use client';
import { useState } from 'react';
import AuthCard from '../../../components/AuthCard';
import { api } from '../../../lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
      window.location.href = '/(auth)/login';
    } catch (err: any) {
      setError(err.message || 'Register failed');
    }
  };
  return (
    <AuthCard title="新規登録">
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border rounded-xl px-4 py-3" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full border rounded-xl px-4 py-3" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full py-3 rounded-xl font-bold bg-black text-white">登録</button>
      </form>
      <div className="mt-4 text-sm text-center">
        すでにアカウントがある？ <a className="underline" href="/(auth)/login">ログイン</a>
      </div>
    </AuthCard>
  );
}
