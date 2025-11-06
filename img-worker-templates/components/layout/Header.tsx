'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { API_CONFIG } from '@/lib/config';

export function Header() {
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/auth/logout`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      // localStorageからトークンを削除
      localStorage.removeItem('__session');

      if (response.ok) {
        // ログアウト成功、ログインページにリダイレクト
        router.push('/login');
      } else {
        console.error('Logout failed');
        // エラーでもログインページにリダイレクト
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // エラーでもログインページにリダイレクト
      router.push('/login');
    }
  };

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b bg-background/95 backdrop-blur">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="検索..."
              className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative rounded-lg p-2 hover:bg-accent transition-colors">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium">管理者</p>
                <p className="text-xs text-muted-foreground">admin@example.com</p>
              </div>
              <Avatar fallback="A" size="md" />
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-white p-1 shadow-lg z-50">
                  <div className="px-2 py-1.5 mb-1">
                    <p className="text-sm font-medium">管理者</p>
                    <p className="text-xs text-muted-foreground">admin@example.com</p>
                  </div>
                  <div className="h-px bg-border my-1"></div>
                  <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors">
                    <User className="h-4 w-4" />
                    プロフィール
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors">
                    <Settings className="h-4 w-4" />
                    設定
                  </button>
                  <div className="h-px bg-border my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    ログアウト
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
