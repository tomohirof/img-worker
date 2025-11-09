'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { api, ApiKeyCreated } from '@/lib/api';
import { useClipboard } from '@/hooks/useClipboard';

interface CreateApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateApiKeyDialog({ isOpen, onClose, onCreated }: CreateApiKeyDialogProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const { copied, copy } = useClipboard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('APIキー名を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await api.createApiKey({ name: name.trim() });
      setCreatedKey(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'APIキーの作成に失敗しました');
      console.error('Failed to create API key:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    setCreatedKey(null);
    onClose();
    if (createdKey) {
      onCreated();
    }
  };

  const handleCopy = () => {
    if (createdKey) {
      copy(createdKey.apiKey);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">新しいAPIキーを作成</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {createdKey ? (
            // Success view
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">APIキーを作成しました</span>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2 text-yellow-800 text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p>
                    このAPIキーは二度と表示されません。必ずコピーして安全な場所に保存してください。
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APIキー
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdKey.apiKey}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                  />
                  <Button onClick={handleCopy} variant="outline" size="sm">
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        コピー済み
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        コピー
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">名前:</span>
                  <p className="font-medium">{createdKey.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">プレビュー:</span>
                  <p className="font-mono text-xs">{createdKey.keyPreview}</p>
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                閉じる
              </Button>
            </div>
          ) : (
            // Create form
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  APIキー名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 本番環境用"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  このAPIキーを識別するための名前を入力してください（1〜100文字）
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? '作成中...' : 'APIキーを作成'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
