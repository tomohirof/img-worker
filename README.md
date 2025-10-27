# OGP Worker

Cloudflare Workers上で動作するOGP画像生成サービス。

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

### 2. 別のターミナルでテストスクリプトを実行

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

# SVG形式で画像生成
curl -X POST http://localhost:8787/render \
  -H "Content-Type: application/json" \
  -H "x-api-key: cwe8yxq4mtc-HCZ9ebm" \
  -d '{
    "format": "svg",
    "width": 1200,
    "height": 630,
    "data": {
      "title": "テスト画像"
    }
  }' \
  --output output.svg

# ヘルスチェック
curl http://localhost:8787/
```

## デプロイ

```bash
npm run deploy
```

## API仕様

### POST /render

画像を生成します。

**認証**: API Keyが必要（ヘッダー `x-api-key` またはクエリパラメータ `api_key`）

**リクエストボディ**:

```json
{
  "template": "magazine-basic",
  "format": "png",
  "width": 1200,
  "height": 630,
  "data": {
    "title": "タイトル（必須）",
    "subtitle": "サブタイトル",
    "brand": "ブランド名",
    "textColor": "#111",
    "bgColor": "#f9f7f4",
    "cover": {
      "image_url": "https://example.com/image.jpg",
      "opacity": 0.25,
      "fit": "cover"
    }
  }
}
```

**レスポンス**: PNG または SVG 画像データ
