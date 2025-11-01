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

      {/* Table Card */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">テンプレート一覧</h2>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 border-b">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>テンプレートがありません</p>
            <Link href="/templates/new" className="mt-4 inline-block">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新規作成
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">テンプレート名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">幅 (px)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">高さ (px)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">背景タイプ</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium">{template.name}</td>
                    <td className="px-4 py-4 text-sm">{template.width}</td>
                    <td className="px-4 py-4 text-sm">{template.height}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        template.background.type === 'color' ? 'bg-blue-100 text-blue-800' :
                        template.background.type === 'image' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {template.background.type === 'color' ? 'カラー' :
                         template.background.type === 'image' ? '画像URL' : 'アップロード'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/templates/${template.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
