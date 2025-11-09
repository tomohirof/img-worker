'use client';

import { ApiKeyInfo } from '@/lib/api';
import { ApiKeyItem } from './ApiKeyItem';

interface ApiKeyListProps {
  apiKeys: ApiKeyInfo[];
  onUpdate: () => void;
}

export function ApiKeyList({ apiKeys, onUpdate }: ApiKeyListProps) {
  if (apiKeys.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm py-12 text-center">
        <p className="text-muted-foreground">APIキーがまだありません</p>
        <p className="text-sm text-muted-foreground mt-2">
          右上の「新しいAPIキーを作成」ボタンからAPIキーを作成できます
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {apiKeys.map((apiKey) => (
        <ApiKeyItem
          key={apiKey.keyId}
          apiKey={apiKey}
          onUpdate={onUpdate}
          onDelete={onUpdate}
        />
      ))}
    </div>
  );
}
