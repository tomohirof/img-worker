# OGP Worker

Cloudflare Workers上で動作するOGP画像生成サービス。テンプレート管理機能とビジュアルエディタを搭載。

## 主な機能

- 🎨 **ビジュアルエディタ**: ドラッグ&ドロップでテンプレートを作成
- 📦 **テンプレート管理**: カスタムテンプレートの保存・編集・削除
- 🖼️ **画像アップロード**: R2ストレージを使った背景画像のアップロード
- 🔤 **自動テキスト調整**: 文字列の長さに応じてフォントサイズと折り返しを自動調整
- 🌐 **PNG/SVG出力**: 用途に応じて画像フォーマットを選択可能

## セットアップ

```bash
npm install
```

## ローカルテスト

### 1. 開発サーバーを起動

```bash
npm run dev
```

デフォルトで `http://localhost:8787` でサーバーが起動します。

### 2. ビジュアルエディタでテンプレート作成（推奨）

ブラウザで `http://localhost:8787/templates/ui` を開き、視覚的にテンプレートを作成できます。

```bash
open http://localhost:8787/templates/ui
```

#### ビジュアルエディタの使い方

1. **新規テンプレート作成**
   - 「新規テンプレート作成」ボタンをクリック
   - テンプレート名、サイズ、背景を設定

2. **背景画像の設定**
   - 背景タイプから選択:
     - **カラー**: 単色の背景
     - **画像URL**: 外部URLから画像を指定
     - **画像アップロード**: ファイルをアップロード（最大10MB、PNG/JPEG/GIF/WebP/SVG対応）

   - 画像アップロードの方法:
     - クリックしてファイルを選択
     - ドラッグ&ドロップでアップロード

3. **テキスト要素の追加**
   - 「テキスト要素を追加」ボタンをクリック
   - キャンバス上でドラッグして位置を調整
   - 右下のハンドルをドラッグしてサイズを変更（幅と高さ）
   - 右パネルでプロパティを編集:
     - 変数名（例: `title`, `subtitle`）
     - フォントサイズ、ファミリー、ウェイト
     - テキスト配置、色
     - 最小フォントサイズ（自動調整時の下限）

4. **プレビュー**
   - 「プレビュー」ボタンで実際のデータで確認
   - テキストの自動折り返しとフォントサイズ調整を確認

5. **保存**
   - 「保存」ボタンでテンプレートを保存
   - 保存後、テンプレート一覧に表示されます

### 3. Webフォームで画像生成

ブラウザで `http://localhost:8787/form` を開くと、直感的なフォームでAPIをテストできます。

```bash
open http://localhost:8787/form
```

フォームでは以下が可能です：
- タイトル、サブタイトル、ブランド名の入力
- フォーマット（PNG/SVG）の選択
- サイズ、色のカスタマイズ
- リアルタイムプレビュー

### 4. コマンドラインでテスト

別のターミナルでテストスクリプトを実行:

```bash
./test-local.sh
```

または手動でcurlコマンドでテスト:

```bash
# PNG形式で画像生成
curl -X POST http://localhost:8787/render \
  -H "Content-Type: application/json" \
  -H "x-api-key: cwe8yxq4mtc-HCZ9ebm" \
  -d '{
    "format": "png",
    "width": 1200,
    "height": 630,
    "data": {
      "title": "テスト画像のタイトル",
      "subtitle": "これはサブタイトルです"
    }
  }' \
  --output output.png

# カスタムテンプレートで画像生成
curl -X POST http://localhost:8787/render \
  -H "Content-Type: application/json" \
  -H "x-api-key: cwe8yxq4mtc-HCZ9ebm" \
  -d '{
    "template": "my-custom-template",
    "format": "png",
    "data": {
      "title": "カスタムテンプレートのタイトル",
      "description": "説明文"
    }
  }' \
  --output custom-output.png
```

## デプロイ

### 初回デプロイ前の準備

1. **R2バケットの作成**

```bash
wrangler r2 bucket create ogp-images
```

2. **KVネームスペースの作成**

```bash
# 本番用
wrangler kv:namespace create "TEMPLATES"

# プレビュー用
wrangler kv:namespace create "TEMPLATES" --preview
```

3. **wrangler.tomlの更新**

作成されたIDを`wrangler.toml`に設定:

```toml
[[kv_namespaces]]
binding = "TEMPLATES"
id = "ここに本番用のID"
preview_id = "ここにプレビュー用のID"
```

### デプロイ実行

```bash
npm run deploy
```

## API仕様

### テンプレート管理API

#### GET /templates/ui

ブラウザベースのテンプレート管理UIを表示します。

#### GET /templates/editor

ビジュアルエディタを表示します。クエリパラメータ `id` でテンプレートを指定して編集可能。

#### GET /templates

すべてのテンプレートを取得します。

**認証**: API Keyが必要

**レスポンス**:
```json
[
  {
    "id": "template-id",
    "name": "テンプレート名",
    "width": 1200,
    "height": 630,
    "background": { "type": "color", "value": "#1e40ff" },
    "elements": [
      {
        "id": "element-id",
        "variable": "title",
        "x": 100,
        "y": 100,
        "fontSize": 64,
        "fontFamily": "Noto Sans JP",
        "color": "#ffffff",
        "textAlign": "left",
        "fontWeight": 700,
        "minFontSize": 32,
        "maxWidth": 1000,
        "maxHeight": 200
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /templates

新しいテンプレートを作成します。

**認証**: API Keyが必要

**リクエストボディ**: テンプレートオブジェクト（上記と同じ構造、`id`, `createdAt`, `updatedAt`は不要）

#### PUT /templates/:id

テンプレートを更新します。

**認証**: API Keyが必要

#### DELETE /templates/:id

テンプレートを削除します。

**認証**: API Keyが必要

### 画像アップロードAPI

#### POST /images/upload

画像をR2ストレージにアップロードします。

**認証**: API Keyが必要

**リクエスト**: `multipart/form-data` で `image` フィールドにファイルを含める

**制限**:
- 最大ファイルサイズ: 10MB
- 対応形式: PNG, JPEG, GIF, WebP, SVG

**レスポンス**:
```json
{
  "success": true,
  "fileId": "uuid",
  "key": "uploads/uuid.png",
  "url": "http://localhost:8787/images/uploads/uuid.png",
  "size": 123456,
  "type": "image/png"
}
```

#### GET /images/:key

R2ストレージから画像を取得します。

**キャッシュ**: 1年間のキャッシュヘッダー付き

### 画像生成API

#### GET /form

Webブラウザから画像生成APIをテストするためのインタラクティブなフォームを表示します。

#### POST /render

画像を生成します。

**認証**: API Keyが必要（ヘッダー `x-api-key` またはクエリパラメータ `api_key`）

**リクエストボディ**:

```json
{
  "template": "magazine-basic",  // テンプレート名（省略可、デフォルト: "magazine-basic"）
  "format": "png",               // "png" または "svg"（デフォルト: "png"）
  "width": 1200,                 // 200-4096（デフォルト: 1200）
  "height": 630,                 // 200-4096（デフォルト: 630）
  "data": {
    "title": "タイトル（必須）",
    "subtitle": "サブタイトル",
    "brand": "ブランド名",
    "textColor": "#111",
    "bgColor": "#f9f7f4",
    "cover": {
      "image_url": "https://example.com/image.jpg",
      "opacity": 0.25,
      "fit": "cover"  // "cover" または "contain"
    }
  }
}
```

**カスタムテンプレート使用時**:

`data`オブジェクトには、テンプレートで定義された変数名をキーとして値を指定します。

```json
{
  "template": "my-custom-template",
  "format": "png",
  "data": {
    "title": "カスタムテンプレートのタイトル",
    "description": "説明文",
    "author": "著者名"
  }
}
```

**レスポンス**: PNG または SVG 画像データ

## テキスト自動調整機能

テンプレート内の各テキスト要素は以下の機能を持ちます：

### 自動折り返し

`maxWidth`を設定すると、テキストが自動的に折り返されます：

```json
{
  "variable": "title",
  "maxWidth": 1000,  // 1000pxを超えると折り返し
  "fontSize": 64
}
```

### フォントサイズ自動調整

`maxHeight`を設定すると、テキストが収まるようにフォントサイズが自動調整されます：

```json
{
  "variable": "title",
  "maxWidth": 1000,
  "maxHeight": 200,   // 200pxに収まるよう調整
  "fontSize": 64,     // 初期サイズ
  "minFontSize": 32   // 最小サイズ（これ以下にはならない）
}
```

調整の仕組み：
1. 初期フォントサイズでテキストを描画
2. `maxHeight`を超えている場合、10%ずつフォントサイズを縮小
3. `minFontSize`に達するまで繰り返し
4. `minFontSize`でも収まらない場合、そのサイズで描画

## プロジェクト構成

```
.
├── src/
│   └── index.tsx          # メインアプリケーション
├── assets/
│   └── fonts/             # Noto Sans JP, Noto Serif JP フォント
├── wrangler.toml          # Cloudflare Workers設定
├── test-local.sh          # ローカルテストスクリプト
└── README.md
```

## 環境変数

`wrangler.toml`で設定:

- `API_KEY`: API認証キー
- `TEMPLATES`: KVネームスペース（テンプレート保存用）
- `IMAGES`: R2バケット（画像保存用）

## ライセンス

MIT
