#!/bin/bash

# Google Fonts ZIPファイルをダウンロードして展開

echo "=== フォントのダウンロード ==="

# 一時ディレクトリを作成
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "1. Noto Sans JP をダウンロード中..."
curl -L "https://fonts.google.com/download?family=Noto%20Sans%20JP" -o noto-sans-jp.zip
unzip -q noto-sans-jp.zip
if [ -f "static/NotoSansJP-Regular.ttf" ]; then
  mv static/NotoSansJP-Regular.ttf "$OLDPWD/assets/fonts/"
  echo "✓ NotoSansJP-Regular.ttf をコピーしました"
else
  echo "✗ NotoSansJP-Regular.ttf が見つかりません"
fi

echo "2. Noto Serif JP をダウンロード中..."
curl -L "https://fonts.google.com/download?family=Noto%20Serif%20JP" -o noto-serif-jp.zip
unzip -q noto-serif-jp.zip
if [ -f "static/NotoSerifJP-Bold.ttf" ]; then
  mv static/NotoSerifJP-Bold.ttf "$OLDPWD/assets/fonts/"
  echo "✓ NotoSerifJP-Bold.ttf をコピーしました"
else
  echo "✗ NotoSerifJP-Bold.ttf が見つかりません"
fi

# クリーンアップ
cd "$OLDPWD"
rm -rf "$TEMP_DIR"

echo ""
echo "=== 完了 ==="
ls -lh assets/fonts/*.ttf
