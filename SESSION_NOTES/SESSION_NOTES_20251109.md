# セッションノート 2025-11-09 (セッション2)

## 実施内容

### ユーザー毎のAPIキー管理機能（バックエンド）の実装 ✅

ユーザーが個別にAPIキーを生成・管理できる機能のバックエンドを実装しました。

#### 実装したファイル

1. **src/api-keys/types.ts** (新規作成)
   - APIキー関連の型定義とKVキー構造
   - `ApiKey`: 内部用の完全なデータ構造（ハッシュ値含む）
   - `ApiKeyInfo`: ユーザー向けの表示用（ハッシュ値除外）
   - `ApiKeyCreated`: 作成時レスポンス（生成されたキーを含む、一度のみ表示）
   - `CreateApiKeyRequest`, `UpdateApiKeyRequest`: リクエスト型
   - `KV_KEYS`: KV Namespaceのキー構造定義
   - 定数: `MAX_API_KEYS_PER_USER = 10`, `API_KEY_LENGTH = 64`

2. **src/api-keys/utils.ts** (新規作成)
   - APIキー生成・ハッシュ化ユーティリティ関数
   - `generateApiKey()`: 暗号論的に安全な64文字の16進数キーを生成
     - `crypto.getRandomValues()`を使用
   - `hashApiKey()`: SHA-256でAPIキーをハッシュ化（保存用）
   - `createKeyPreview()`: 末尾8文字のみ表示するプレビュー文字列を生成
     - 例: `****...abc12345`

3. **src/api-keys/api-key.ts** (新規作成)
   - APIキーのCRUD操作を実装
   - `createApiKey()`: 新規APIキー作成
     - ユーザーの既存キー数チェック（上限10個）
     - ハッシュ値とキーIDのインデックスを作成
     - ユーザーのキーリストに追加
   - `validateApiKey()`: APIキー検証（認証時に使用）
     - ハッシュからキーIDを検索
     - 有効/無効フラグをチェック
   - `getUserApiKeys()`: ユーザーの全APIキーを取得
   - `updateApiKey()`: APIキーの名前・有効/無効を更新
   - `deleteApiKey()`: APIキー削除
   - `recordLastUsed()`: 最終使用日時を記録
   - `toApiKeyInfo()`: ハッシュ値を除外した表示用データに変換

4. **src/middleware/api-auth.ts** (新規作成)
   - APIキー認証ミドルウェア
   - `requireApiKeyAuth()`: APIキー認証を要求
     - ヘッダー（`x-api-key`）またはクエリパラメータ（`api_key`）からキーを取得
     - APIキーを検証
     - 最終使用日時を非同期で記録（エラーは無視）
     - コンテキストにユーザーIDを設定
   - `getApiUserId()`: 認証されたユーザーIDを取得

5. **src/api-keys/routes.ts** (新規作成)
   - APIキー管理エンドポイント（セッション認証必須）
   - `GET /api-keys` - APIキー一覧取得
   - `POST /api-keys` - APIキー作成
     - バリデーション: 名前は1〜100文字
     - 上限チェック（10個/ユーザー）
   - `GET /api-keys/:keyId` - 特定のAPIキー取得
     - 所有者チェック
   - `PATCH /api-keys/:keyId` - APIキー更新
     - 名前、有効/無効フラグを更新可能
     - 所有者チェック
   - `DELETE /api-keys/:keyId` - APIキー削除
     - 所有者チェック

6. **src/index.tsx** (変更)
   - `apiKeysApp`と`requireApiKeyAuth`をインポート
   - `/api-keys`エンドポイントをマウント
   - `requireApiKey()`関数を更新:
     - 非同期関数に変更
     - ユーザー固有のAPIキーを優先的にチェック
     - フォールバックとして環境変数`API_KEY`もサポート（後方互換性）
     - コンテキストにユーザーID（`apiUserId`）を設定
   - `/render`エンドポイントで`await requireApiKey(c)`に変更（非同期化対応）
   - CORS設定に`localhost:1033`を追加

#### 開発アプローチ

- CODEX MCPに相談して設計方針とテスト方針を決定
- 既存の`src/auth/user.ts`のパターンを参考に実装
- 既存の`src/auth/routes.ts`のリセットトークン生成ロジックを参考にAPIキー生成を実装

#### セキュリティ

- APIキーはSHA-256でハッシュ化してKV Namespaceに保存
- 平文のAPIキーは作成時の1回のみ返却（`ApiKeyCreated`）
- `crypto.getRandomValues()`を使用した暗号論的に安全な乱数生成
- ユーザーは自分のAPIキーのみアクセス可能（権限チェック）
- 最終使用日時を自動記録（監査用）

#### KVデータ構造

```
apikey:id:{keyId}        → ApiKey（完全なデータ）
apikey:hash:{keyHash}    → keyId（ハッシュからIDへのインデックス）
user:apikeys:{userId}    → string[]（ユーザーのAPIキーIDリスト）
```

#### Gitコミット

コミットID: `ca2c646`
コミットメッセージ: `feat: ユーザー毎のAPIキー管理機能（バックエンド）を実装`

---

## 今後のタスク

### 次のセッションで実装すること（優先度: 高）

#### 1. フロントエンド: APIクライアント関数を追加

**ファイル**: `img-worker-templates/lib/api-client.ts`

既存のAPIクライアント関数に追加:
- `getApiKeys()`: APIキー一覧取得
- `createApiKey(name: string)`: APIキー作成
- `updateApiKey(keyId: string, updates: UpdateApiKeyRequest)`: APIキー更新
- `deleteApiKey(keyId: string)`: APIキー削除

参考: 既存の`getTemplates()`, `createTemplate()`などの実装パターン

#### 2. フロントエンド: APIキー管理UIコンポーネントを作成

**推奨コンポーネント分割**:

1. **components/api-keys/ApiKeyList.tsx**
   - APIキー一覧表示
   - 各キーの情報: 名前、プレビュー、作成日時、最終使用日時、有効/無効ステータス
   - アクション: 名前変更、有効/無効切り替え、削除

2. **components/api-keys/CreateApiKeyDialog.tsx**
   - APIキー作成ダイアログ
   - 入力: キー名（1〜100文字）
   - 作成後: 生成されたAPIキーを一度だけ表示（コピーボタン付き）
   - 警告: 「このAPIキーは二度と表示されません」

3. **components/api-keys/ApiKeyItem.tsx**
   - 個別のAPIキー表示カード
   - プレビュー表示（`****...abc12345`）
   - 最終使用日時の表示
   - 有効/無効トグル
   - 削除ボタン（確認ダイアログ付き）

#### 3. フロントエンド: APIキー管理ページを作成

**ファイル**: `img-worker-templates/app/api-keys/page.tsx`

- ページタイトル: 「APIキー管理」
- 説明文: APIキーの用途と注意事項
- 「新しいAPIキーを作成」ボタン
- APIキー一覧表示（`ApiKeyList`コンポーネント）
- 上限表示: 「X / 10 個のAPIキーを使用中」
- 空の状態: 「APIキーがまだありません」

#### 4. 左メニューにAPIキー項目を追加

**ファイル**: `img-worker-templates/components/layout/Sidebar.tsx`

`navItems`配列に追加:
```typescript
{ href: "/api-keys", label: "APIキー", icon: Key }
```

アイコン: `lucide-react`の`Key`アイコンを使用

#### 5. ローカル環境でテストと動作確認

テスト項目:
- [ ] APIキーの作成（正常系）
- [ ] APIキーの作成（上限10個に達した場合のエラー）
- [ ] APIキーの一覧表示
- [ ] APIキーの名前変更
- [ ] APIキーの有効/無効切り替え
- [ ] APIキーの削除
- [ ] 生成されたAPIキーをコピーして`/render`エンドポイントで認証テスト
- [ ] 環境変数`API_KEY`でも引き続き認証できることを確認（後方互換性）

#### 6. Gitコミットとデプロイ

- フロントエンドの変更をコミット
- Cloudflare Pagesにデプロイ
- 本番環境で動作確認

---

## メモ

### 設計上の決定事項

1. **シンプルな権限モデル**
   - 全てのAPIキーは同じ権限（フル権限）
   - 将来的にスコープを追加する場合は`ApiKey`インターフェースに`scopes: string[]`を追加

2. **有効期限なし**
   - ユーザーが明示的に無効化または削除するまで有効
   - 将来的に有効期限を追加する場合は`expiresAt?: number`を追加

3. **基本的な統計情報のみ**
   - 最終使用日時のみ記録
   - 将来的に使用回数などを追加する場合は`usageCount?: number`を追加

4. **上限: 10個/ユーザー**
   - スパム防止と管理の簡素化のため
   - `MAX_API_KEYS_PER_USER`定数で制御

### 参考ファイル

フロントエンド実装時に参考にすべきファイル:
- `img-worker-templates/app/templates/page.tsx` - ページレイアウト
- `img-worker-templates/lib/api-client.ts` - API呼び出しパターン
- `img-worker-templates/components/editor/PropertiesPanel.tsx` - タブUIの実装例

---

## Git履歴

```bash
git log --oneline -3
```

最新のコミット:
- `ca2c646` feat: ユーザー毎のAPIキー管理機能（バックエンド）を実装
- `89320cc` feat: テンプレート編集画面にAPI情報タブを追加
- `41dbd87` fix: テンプレート編集画面のUI改善

---

## 次回セッション開始時の確認事項

1. バックエンドが正しくデプロイされているか確認
2. `/api-keys`エンドポイントが正常に動作するか確認（cURLでテスト可能）
3. フロントエンド開発サーバーが起動しているか確認（`PORT=1033 npm run dev`）
