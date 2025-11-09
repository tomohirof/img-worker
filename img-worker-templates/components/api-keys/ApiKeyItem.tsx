'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Trash2, Edit2, Power, PowerOff, Check, X } from 'lucide-react';
import { api, ApiKeyInfo } from '@/lib/api';

interface ApiKeyItemProps {
  apiKey: ApiKeyInfo;
  onUpdate: () => void;
  onDelete: () => void;
}

export function ApiKeyItem({ apiKey, onUpdate, onDelete }: ApiKeyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(apiKey.name);
  const [loading, setLoading] = useState(false);

  const handleToggleActive = async () => {
    if (!confirm(`このAPIキーを${apiKey.isActive ? '無効化' : '有効化'}しますか？`)) {
      return;
    }

    try {
      setLoading(true);
      await api.updateApiKey(apiKey.keyId, { isActive: !apiKey.isActive });
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました');
      console.error('Failed to toggle API key:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      alert('APIキー名を入力してください');
      return;
    }

    try {
      setLoading(true);
      await api.updateApiKey(apiKey.keyId, { name: name.trim() });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました');
      console.error('Failed to update API key name:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setName(apiKey.name);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('このAPIキーを削除しますか？この操作は元に戻せません。')) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteApiKey(apiKey.keyId);
      onDelete();
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
      console.error('Failed to delete API key:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`rounded-lg border bg-card shadow-sm p-4 ${!apiKey.isActive ? 'opacity-60' : ''}`}>
      <div className="space-y-3">
        {/* Name and Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                  disabled={loading}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={loading}
                  className="text-green-600 hover:text-green-700 p-1"
                  title="保存"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="text-gray-600 hover:text-gray-700 p-1"
                  title="キャンセル"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg truncate">{apiKey.name}</h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="名前を編集"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              apiKey.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {apiKey.isActive ? '有効' : '無効'}
          </span>
        </div>

        {/* Key Preview */}
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-xs text-gray-600 mb-1">APIキー</div>
          <div className="font-mono text-sm">{apiKey.keyPreview}</div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">作成日時:</span>
            <p className="text-xs mt-0.5">{formatDate(apiKey.createdAt)}</p>
          </div>
          <div>
            <span className="text-gray-600">最終使用:</span>
            <p className="text-xs mt-0.5">
              {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : '未使用'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            disabled={loading}
            className="flex-1"
          >
            {apiKey.isActive ? (
              <>
                <PowerOff className="h-4 w-4 mr-2" />
                無効化
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-2" />
                有効化
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
