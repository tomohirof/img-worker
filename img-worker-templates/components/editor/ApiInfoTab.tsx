'use client';

import { useState } from 'react';
import { Template } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import {
  buildApiEndpoints,
  buildCurlExample,
  buildJavaScriptExample,
  extractRequiredParams,
} from '@/lib/api-info-utils';
import { useClipboard } from '@/hooks/useClipboard';
import { Button } from '@/components/ui/Button';
import { Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Props {
  template: Template;
}

type CodeTab = 'curl' | 'javascript';

export function ApiInfoTab({ template }: Props) {
  const { copied, copy } = useClipboard();
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('curl');

  const endpoints = buildApiEndpoints(template.id);
  const requiredParams = extractRequiredParams(template.elements);

  const curlExample = buildCurlExample(
    template.id,
    API_CONFIG.API_KEY,
    API_CONFIG.BASE_URL,
    requiredParams
  );

  const jsExample = buildJavaScriptExample(
    template.id,
    API_CONFIG.API_KEY,
    API_CONFIG.BASE_URL,
    requiredParams
  );

  const CopyButton = ({ text, label }: { text: string; label?: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copy(text)}
      className="gap-1"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          コピー済み
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label || 'コピー'}
        </>
      )}
    </Button>
  );

  return (
    <div className="space-y-6 p-4">
      {/* エンドポイント（本番） */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          エンドポイント（本番）
        </label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-md border bg-gray-50 px-3 py-2 text-sm font-mono overflow-x-auto">
            {endpoints.production}
          </div>
          <CopyButton text={endpoints.production} />
        </div>
      </div>

      {/* エンドポイント（ローカル開発） */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          エンドポイント（ローカル開発）
        </label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-md border bg-gray-50 px-3 py-2 text-sm font-mono overflow-x-auto">
            {endpoints.local}
          </div>
          <CopyButton text={endpoints.local} />
        </div>
      </div>

      {/* テンプレートID */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          テンプレートID
        </label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-md border bg-gray-50 px-3 py-2 text-sm font-mono overflow-x-auto">
            {template.id}
          </div>
          <CopyButton text={template.id} />
        </div>
      </div>

      {/* リクエスト例 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          リクエスト例
        </label>

        {/* タブヘッダー */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveCodeTab('curl')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeCodeTab === 'curl'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            cURL
          </button>
          <button
            onClick={() => setActiveCodeTab('javascript')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeCodeTab === 'javascript'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            JavaScript
          </button>
        </div>

        {/* コード表示エリア */}
        <div className="relative">
          <pre className="rounded-md border bg-gray-900 text-gray-100 px-4 py-3 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
            {activeCodeTab === 'curl' ? curlExample : jsExample}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton
              text={activeCodeTab === 'curl' ? curlExample : jsExample}
            />
          </div>
        </div>
      </div>

      {/* 必須パラメータ */}
      {requiredParams.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            必須パラメータ
          </label>
          <ul className="space-y-1 rounded-md border bg-gray-50 px-4 py-3">
            {requiredParams.map((param) => (
              <li key={param} className="text-sm text-gray-700">
                • <span className="font-mono font-medium">{param}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 画像生成テストページへのリンク */}
      <div className="pt-4 border-t">
        <Link href={`/generate-test?template=${template.id}`}>
          <Button className="w-full gap-2" variant="outline">
            <ExternalLink className="h-4 w-4" />
            画像生成テストを開く
          </Button>
        </Link>
      </div>
    </div>
  );
}
