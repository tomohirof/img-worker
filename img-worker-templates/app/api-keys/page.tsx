'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiKeyInfo } from '@/lib/api';
import { CreateApiKeyDialog } from '@/components/api-keys/CreateApiKeyDialog';
import { ApiKeyList } from '@/components/api-keys/ApiKeyList';

const MAX_API_KEYS = 10;

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listApiKeys();
      setApiKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleApiKeyCreated = () => {
    loadApiKeys();
  };

  const isLimitReached = apiKeys.length >= MAX_API_KEYS;

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">APIキー管理</h1>
            <p className="text-muted-foreground mt-1">
              画像生成APIにアクセスするためのAPIキーを管理
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setIsDialogOpen(true)}
            disabled={isLimitReached}
          >
            <Plus className="h-5 w-5 mr-2" />
            新しいAPIキーを作成
          </Button>
        </div>

        {/* Usage Counter */}
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm">
            <span className="font-medium">
              {apiKeys.length} / {MAX_API_KEYS} 個のAPIキーを使用中
            </span>
            {isLimitReached && (
              <span className="text-yellow-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                上限に達しました
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h3 className="font-medium text-blue-900 mb-2">APIキーについて</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>APIキーは画像生成API（/render）へのアクセスに必要です</li>
          <li>
            リクエスト時にヘッダー（<code className="bg-blue-100 px-1 rounded">x-api-key</code>）
            またはクエリパラメータ（<code className="bg-blue-100 px-1 rounded">api_key</code>）
            で指定してください
          </li>
          <li>APIキーは作成時の一度のみ表示されます。必ず安全な場所に保存してください</li>
          <li>無効化されたAPIキーは使用できませんが、再度有効化できます</li>
          <li>最大{MAX_API_KEYS}個まで作成できます</li>
        </ul>
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
      ) : (
        <ApiKeyList apiKeys={apiKeys} onUpdate={loadApiKeys} />
      )}

      {/* Create API Key Dialog */}
      <CreateApiKeyDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onCreated={handleApiKeyCreated}
      />
    </AdminLayout>
  );
}
