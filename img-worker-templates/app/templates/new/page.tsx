'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewテンプレートPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: フォーム送信処理
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link href="/templates" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          テンプレート一覧に戻る
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">テンプレートの新規作成</h1>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-lg border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                テンプレート名 <span className="text-red-600">*</span>
              </label>
              <Input 
                type="text" 
                placeholder="例: Webinar Header"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                幅 (px) <span className="text-red-600">*</span>
              </label>
              <Input 
                type="number" 
                placeholder=""
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                高さ (px) <span className="text-red-600">*</span>
              </label>
              <Input 
                type="number" 
                placeholder=""
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                背景タイプ <span className="text-red-600">*</span>
              </label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="color">カラー</option>
                <option value="image">画像</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                背景色 (HEX)
              </label>
              <Input 
                type="text" 
                placeholder="#0000FF"
                
              />
              <p className="text-xs text-muted-foreground mt-1">backgroundType = color のときに使用</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                背景画像 URL
              </label>
              <Input 
                type="text" 
                placeholder="https://example.com/image.png"
                
              />
              <p className="text-xs text-muted-foreground mt-1">backgroundType = image のときに使用</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" size="lg">
                作成
              </Button>
              <Link href="/templates">
                <Button type="button" variant="outline" size="lg">
                  キャンセル
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
