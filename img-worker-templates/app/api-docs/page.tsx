'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { useState } from 'react';

export default function ApiDocsPage() {
  const [apiKey] = useState('cwe8yxq4mtc-HCZ9ebm'); // デフォルトのAPIキー

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('コピーしました');
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">APIドキュメント</h1>
          <p className="text-muted-foreground mt-1">
            OGP画像生成APIの使用方法とエンドポイント一覧
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 認証 */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">認証</h2>
          <p className="text-sm text-muted-foreground mb-4">
            すべてのAPIリクエストには、以下のいずれかの方法でAPIキーを含める必要があります。
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">方法1: HTTPヘッダー（推奨）</h3>
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                <code>{`x-api-key: ${apiKey}`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-medium mb-2">方法2: クエリパラメータ</h3>
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                <code>{`?api_key=${apiKey}`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* テンプレートAPI */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">テンプレートAPI</h2>

          {/* GET /templates */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                GET
              </span>
              <code className="text-lg">/templates</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              すべてのテンプレートを取得します。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl -H "x-api-key: ${apiKey}" \\
  http://localhost:8787/templates`}</code>
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">レスポンス例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`[
  {
    "id": "template-123",
    "name": "ブログ用画像",
    "width": 1200,
    "height": 630,
    "background": {
      "type": "color",
      "value": "#f9f7f4"
    },
    "elements": [
      {
        "id": "el-1",
        "variable": "title",
        "x": 100,
        "y": 200,
        "fontSize": 48,
        "fontFamily": "Noto Sans JP",
        "color": "#111",
        "fontWeight": 700,
        "textAlign": "left"
      }
    ],
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-01T10:00:00Z"
  }
]`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* GET /templates/:id */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                GET
              </span>
              <code className="text-lg">/templates/:id</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              特定のテンプレートを取得します。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl -H "x-api-key: ${apiKey}" \\
  http://localhost:8787/templates/template-123`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* PUT /templates/:id */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-md text-sm font-medium">
                PUT
              </span>
              <code className="text-lg">/templates/:id</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              テンプレートを作成または更新します。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl -X PUT \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "ブログ用画像",
    "width": 1200,
    "height": 630,
    "background": {
      "type": "color",
      "value": "#f9f7f4"
    },
    "elements": [
      {
        "id": "el-1",
        "variable": "title",
        "x": 100,
        "y": 200,
        "fontSize": 48,
        "fontFamily": "Noto Sans JP",
        "color": "#111",
        "fontWeight": 700,
        "textAlign": "left"
      }
    ]
  }' \\
  http://localhost:8787/templates/my-template`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* DELETE /templates/:id */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium">
                DELETE
              </span>
              <code className="text-lg">/templates/:id</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              テンプレートを削除します。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl -X DELETE \\
  -H "x-api-key: ${apiKey}" \\
  http://localhost:8787/templates/template-123`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* 画像生成API */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">画像生成API</h2>

          {/* POST /render */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                POST
              </span>
              <code className="text-lg">/render</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              テンプレートを使用してOGP画像を生成します。PNG形式またはSVG形式で出力できます。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエストボディ</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`{
  "template": {
    "id": "template-123",
    "name": "ブログ用画像",
    "width": 1200,
    "height": 630,
    "background": {
      "type": "color",
      "value": "#f9f7f4"
    },
    "elements": [
      {
        "id": "el-1",
        "variable": "title",
        "x": 100,
        "y": 200,
        "fontSize": 48,
        "fontFamily": "Noto Sans JP",
        "color": "#111",
        "fontWeight": 700,
        "textAlign": "left"
      }
    ]
  },
  "format": "png",  // "png" または "svg"
  "data": {
    "title": "記事のタイトル",
    "subtitle": "サブタイトル"
  }
}`}</code>
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl -X POST \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d @request.json \\
  --output output.png \\
  http://localhost:8787/render`}</code>
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">レスポンス</h4>
                <p className="text-sm text-muted-foreground">
                  生成された画像ファイル（PNG形式またはSVG形式）がバイナリデータとして返されます。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 画像管理API */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">画像管理API</h2>

          {/* POST /images/upload */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                POST
              </span>
              <code className="text-lg">/images/upload</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              画像をアップロードしてR2ストレージに保存します。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl -X POST \\
  -H "x-api-key: ${apiKey}" \\
  -F "file=@image.png" \\
  http://localhost:8787/images/upload`}</code>
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">レスポンス例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`{
  "url": "http://localhost:8787/images/abc123.png"
}`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* GET /images/* */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                GET
              </span>
              <code className="text-lg">/images/:filename</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              アップロードされた画像を取得します。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl http://localhost:8787/images/abc123.png`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* DELETE /images/* */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium">
                DELETE
              </span>
              <code className="text-lg">/images/:filename</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              アップロードされた画像を削除します。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl -X DELETE \\
  -H "x-api-key: ${apiKey}" \\
  http://localhost:8787/images/abc123.png`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* その他のAPI */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">その他のAPI</h2>

          {/* GET / */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
                GET
              </span>
              <code className="text-lg">/</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ヘルスチェックエンドポイント。APIが正常に動作しているか確認できます。
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">リクエスト例</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>{`curl http://localhost:8787/`}</code>
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">レスポンス</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  <code>ok</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* エラーレスポンス */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">エラーレスポンス</h2>
          <p className="text-sm text-muted-foreground mb-4">
            エラーが発生した場合、以下の形式でエラーメッセージが返されます。
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">401 Unauthorized</h3>
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                <code>{`{
  "error": "Unauthorized"
}`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-medium mb-2">404 Not Found</h3>
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                <code>{`{
  "error": "Template not found"
}`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-medium mb-2">500 Internal Server Error</h3>
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                <code>{`{
  "error": "Internal server error"
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
