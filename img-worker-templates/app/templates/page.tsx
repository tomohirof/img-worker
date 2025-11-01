'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, Template } from '@/lib/api';

export default function テンプレートListPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return;

    try {
      await api.deleteTemplate(id);
      await loadTemplates(); // Reload list
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
      console.error('Failed to delete template:', err);
    }
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">テンプレート一覧</h1>
            <p className="text-muted-foreground mt-1">画像生成用テンプレートの管理</p>
          </div>
          <Link href="/templates/new">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              新規作成
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-600 p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-sm py-12 text-center">
          <p className="text-muted-foreground">テンプレートがありません</p>
          <Link href="/templates/new" className="mt-4 inline-block">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="aspect-[1200/630] bg-gray-100 relative">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-sm">プレビューなし</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 truncate">{template.name}</h3>

                <div className="space-y-1 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center justify-between">
                    <span>サイズ:</span>
                    <span className="font-medium text-foreground">
                      {template.width} × {template.height}px
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>背景:</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      template.background.type === 'color' ? 'bg-blue-100 text-blue-800' :
                      template.background.type === 'image' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {template.background.type === 'color' ? 'カラー' :
                       template.background.type === 'image' ? '画像URL' : 'アップロード'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link href={`/templates/${template.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      編集
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
