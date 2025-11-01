'use client';

import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  templateName: string;
  onAddTextElement: () => void;
  onPreview: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function Toolbar({
  templateName,
  onAddTextElement,
  onPreview,
  onSave,
  isSaving = false,
}: Props) {
  return (
    <div className="bg-white border-b px-5 py-3 flex items-center gap-3">
      <h1 className="text-lg font-semibold flex-1">
        ビジュアルエディタ - {templateName || '新規テンプレート'}
      </h1>
      <Button variant="outline" size="sm" onClick={onAddTextElement}>
        テキスト要素を追加
      </Button>
      <Button variant="outline" size="sm" onClick={onPreview}>
        プレビュー
      </Button>
      <Button size="sm" onClick={onSave} disabled={isSaving}>
        {isSaving ? '保存中...' : '保存'}
      </Button>
      <Link href="/templates">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
      </Link>
    </div>
  );
}
