'use client';
import { useState } from 'react';
import AuthCard from '../../../components/AuthCard';
import { API_BASE, api } from '../../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };
  return (
    <AuthCard title="ログイン">
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border rounded-xl px-4 py-3" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full border rounded-xl px-4 py-3" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full py-3 rounded-xl font-bold bg-black text-white">ログイン</button>
      </form>
      <div className="mt-6">
        <a href={`${API_BASE}/auth/github`} className="w-full block text-center py-3 rounded-xl font-bold border">
          GitHubで続行
        </a>
      </div>
      <div className="mt-4 text-sm text-center">
        アカウントがない？ <a className="underline" href="/(auth)/register">新規登録</a>
      </div>
    </AuthCard>
  );
}
