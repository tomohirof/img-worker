# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Cloudflare Workers上で動作するOGP画像生成サービス。HonoフレームワークとSatori、resvg-wasmを使用して、動的にPNG/SVG形式の画像を生成します。

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# ローカル開発サーバーの起動
npm run dev

# ローカルテストの実行（別ターミナルで）
./test-local.sh

# Cloudflare Workersへのデプロイ
npm run deploy
```

## アーキテクチャ

### 技術スタック
- **Cloudflare Workers**: エッジでの実行環境
- **Hono**: 軽量なWebフレームワーク
- **Satori**: JSXからSVG生成
- **resvg-wasm**: SVGからPNG変換（WebAssembly）

### 主要コンポーネント (src/index.ts)

1. **フォント管理**
   - Google Fontsから日本語フォント（Noto Sans JP、Noto Serif JP）を動的読み込み
   - `ensureFonts()`: 初回リクエスト時のみフォントを読み込み、以降はキャッシュ

2. **画像変換**
   - `toDataUrl()`: 外部画像URLをData URLに変換（カバー画像用）

3. **テンプレートシステム**
   - `templateMagazineBasic()`: 雑誌風デザインのOGP画像テンプレート
   - カスタマイズ可能な要素: タイトル、サブタイトル、ブランド名、色、カバー画像

4. **APIエンドポイント**
   - `GET /`: ヘルスチェック
   - `POST /render`: 画像生成（API Key認証必須）

### 環境変数（wrangler.toml）

- `API_KEY`: API認証用キー（ヘッダー `x-api-key` またはクエリパラメータ `api_key` で指定）
- `RESVG_WASM`: WebAssemblyモジュール（wrangler.tomlでバインディング設定済み）

### `/render` APIリクエスト形式

```typescript
{
  "template": "magazine-basic",  // 現在はこのテンプレートのみ
  "format": "png" | "svg",       // デフォルト: "png"
  "width": number,               // 200-4096、デフォルト: 1200
  "height": number,              // 200-4096、デフォルト: 630
  "data": {
    "title": string,             // 必須
    "subtitle": string,
    "brand": string,             // デフォルト: "SIXONE MAGAZINE"
    "textColor": string,         // デフォルト: "#111"
    "bgColor": string,           // デフォルト: "#f9f7f4"
    "cover": {
      "image_url": string,
      "opacity": number,         // デフォルト: 0.25
      "fit": "cover" | "contain" // デフォルト: "cover"
    }
  }
}
```

## ローカルテスト

### 開発サーバーの起動

```bash
npm run dev
```

デフォルトで `http://localhost:8787` でサーバーが起動します。

### テストスクリプトの実行

自動テストスクリプト `test-local.sh` を実行（開発サーバー起動後、別ターミナルで）:

```bash
./test-local.sh
```

このスクリプトは以下をテストします:
- PNG形式での画像生成
- SVG形式での画像生成
- ヘルスチェックエンドポイント

生成された画像は `test-output.png` と `test-output.svg` に保存されます。

### 手動テスト

```bash
# PNG形式で画像生成
curl -X POST http://localhost:8787/render \
  -H "Content-Type: application/json" \
  -H "x-api-key: cwe8yxq4mtc-HCZ9ebm" \
  -d '{"format": "png", "data": {"title": "テスト"}}' \
  --output output.png

# ヘルスチェック
curl http://localhost:8787/
```

## 開発時の注意点

### テンプレート追加時
- 新しいテンプレート関数は `templateMagazineBasic()` を参考に作成
- Satoriで使用可能なCSSプロパティには制限あり（Flexboxベース）
- フォントは事前に`ensureFonts()`で読み込む必要がある

### フォント追加時
- Google Fonts等から `.woff2` 形式を取得
- `loadFonts()` 関数で読み込みを追加
- Satoriの `fonts` 配列に追加（name、data、weight、styleを指定）

### WebAssembly
- resvg-wasmは `wrangler.toml` の `[wasm_modules]` でバインディング設定済み
- `initWasm()` は必ずPNG生成前に実行する

### 画像サイズ制限
- 最小: 200x200px
- 最大: 4096x4096px
- この範囲外の値は自動的にクランプされる
