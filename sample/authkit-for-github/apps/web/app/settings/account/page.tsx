'use client';
import { useEffect, useState } from 'react';
import AuthCard from '../../../components/AuthCard';
import { api } from '../../../lib/api';

export default function AccountSettings() {
  const [me, setMe] = useState<any>(null);
  const [curr, setCurr] = useState('');
  const [nw, setNw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(()=>{
    api('/auth/me').then(d=>setMe(d.user)).catch(()=>setMe(null));
  },[]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/auth/password/change', { method: 'POST', body: JSON.stringify({ currentPassword: curr, newPassword: nw }) });
      setMsg('パスワードを更新しました');
      setCurr(''); setNw('');
    } catch (e: any) {
      setMsg(e.message || '変更に失敗しました');
    }
  };

  const deleteAccount = async () => {
    if (!confirm('本当に退会しますか？')) return;
    await api('/auth/user/delete', { method: 'POST' });
    window.location.href = '/(auth)/login';
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    window.location.href = '/(auth)/login';
  };

  return (
    <AuthCard title="アカウント設定">
      {me ? <p className="mb-4 text-sm text-gray-600">ログイン中: <b>{me.email}</b></p> : <p className="mb-4">未ログイン</p>}
      <form onSubmit={changePassword} className="space-y-3">
        <input type="password" className="w-full border rounded-xl px-4 py-3" placeholder="現在のパスワード" value={curr} onChange={e=>setCurr(e.target.value)} />
        <input type="password" className="w-full border rounded-xl px-4 py-3" placeholder="新しいパスワード" value={nw} onChange={e=>setNw(e.target.value)} />
        <button className="w-full py-3 rounded-xl font-bold bg-black text-white">パスワード変更</button>
      </form>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={logout} className="py-3 rounded-xl font-bold border">ログアウト</button>
        <button onClick={deleteAccount} className="py-3 rounded-xl font-bold border border-red-600 text-red-600">退会</button>
      </div>
    </AuthCard>
  );
}
