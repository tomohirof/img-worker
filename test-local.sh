#!/bin/bash

# ローカルテスト用スクリプト
# 使い方: ./test-local.sh

API_KEY="cwe8yxq4mtc-HCZ9ebm"
ENDPOINT="http://localhost:8787/render"

echo "=== OGP画像生成APIローカルテスト ==="
echo ""

# テスト1: PNG形式で生成
echo "テスト1: PNG形式で画像生成"
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "format": "png",
    "width": 1200,
    "height": 630,
    "data": {
      "title": "テスト画像のタイトル",
      "subtitle": "これはサブタイトルです",
      "brand": "TEST BRAND",
      "textColor": "#111",
      "bgColor": "#f9f7f4"
    }
  }' \
  --output test-output.png

if [ -f test-output.png ]; then
  echo "✓ PNG画像を test-output.png に保存しました"
  echo ""
else
  echo "✗ 画像生成に失敗しました"
  exit 1
fi

# テスト2: SVG形式で生成
echo "テスト2: SVG形式で画像生成"
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "format": "svg",
    "width": 1200,
    "height": 630,
    "data": {
      "title": "SVGテスト",
      "subtitle": "ベクター形式",
      "brand": "SVG BRAND"
    }
  }' \
  --output test-output.svg

if [ -f test-output.svg ]; then
  echo "✓ SVG画像を test-output.svg に保存しました"
  echo ""
else
  echo "✗ SVG生成に失敗しました"
  exit 1
fi

# テスト3: ヘルスチェック
echo "テスト3: ヘルスチェック"
HEALTH=$(curl -s http://localhost:8787/)
if [ "$HEALTH" = "ok" ]; then
  echo "✓ ヘルスチェック成功: $HEALTH"
else
  echo "✗ ヘルスチェック失敗"
  exit 1
fi

echo ""
echo "=== すべてのテストが成功しました! ==="
echo "生成された画像:"
echo "  - test-output.png"
echo "  - test-output.svg"
