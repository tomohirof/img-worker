/**
 * /form エンドポイント用のHTMLテンプレート
 * OGP画像生成のテストフォーム
 */
export function getFormHtml(): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OGP画像生成テストフォーム</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1 { color: #333; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; }
    input, select, textarea { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #007bff; }
    .row { display: flex; gap: 20px; }
    .row .form-group { flex: 1; }
    button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; width: 100%; }
    button:hover { background: #0056b3; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    #preview { margin-top: 30px; padding: 20px; border: 2px dashed #ddd; border-radius: 4px; min-height: 200px; display: flex; align-items: center; justify-content: center; }
    #preview img { max-width: 100%; height: auto; }
    .error { color: #dc3545; margin-top: 10px; padding: 10px; background: #f8d7da; border-radius: 4px; display: none; }
    .success { color: #155724; margin-top: 10px; padding: 10px; background: #d4edda; border-radius: 4px; display: none; }
  </style>
</head>
<body>
  <h1>OGP画像生成テストフォーム</h1>

  <form id="renderForm">
    <div class="form-group">
      <label for="apiKey">APIキー *</label>
      <input type="password" id="apiKey" required placeholder="APIキーを入力してください">
    </div>

    <div class="form-group">
      <label for="title">タイトル *</label>
      <input type="text" id="title" required placeholder="例: テストタイトル" value="サンプルタイトル">
    </div>

    <div class="form-group">
      <label for="subtitle">サブタイトル</label>
      <input type="text" id="subtitle" placeholder="例: サブタイトル" value="これはサブタイトルです">
    </div>

    <div class="form-group">
      <label for="brand">ブランド名</label>
      <input type="text" id="brand" placeholder="デフォルト: SIXONE MAGAZINE" value="SIXONE MAGAZINE">
    </div>

    <div class="row">
      <div class="form-group">
        <label for="format">フォーマット</label>
        <select id="format">
          <option value="png">PNG</option>
          <option value="svg">SVG</option>
        </select>
      </div>
      <div class="form-group">
        <label for="width">幅 (px)</label>
        <input type="number" id="width" min="200" max="4096" value="1200">
      </div>
      <div class="form-group">
        <label for="height">高さ (px)</label>
        <input type="number" id="height" min="200" max="4096" value="630">
      </div>
    </div>

    <div class="row">
      <div class="form-group">
        <label for="textColor">テキスト色</label>
        <input type="color" id="textColor" value="#111111">
      </div>
      <div class="form-group">
        <label for="bgColor">背景色</label>
        <input type="color" id="bgColor" value="#f9f7f4">
      </div>
    </div>

    <div class="form-group">
      <label for="coverImage">カバー画像URL</label>
      <input type="url" id="coverImage" placeholder="https://example.com/image.jpg">
    </div>

    <div class="row">
      <div class="form-group">
        <label for="coverOpacity">カバー透明度</label>
        <input type="number" id="coverOpacity" min="0" max="1" step="0.05" value="0.25">
      </div>
      <div class="form-group">
        <label for="coverFit">カバーフィット</label>
        <select id="coverFit">
          <option value="cover">cover</option>
          <option value="contain">contain</option>
        </select>
      </div>
    </div>

    <button type="submit" id="submitBtn">画像を生成</button>

    <div class="error" id="errorMsg"></div>
    <div class="success" id="successMsg"></div>
  </form>

  <div id="preview">
    <p style="color: #999;">生成された画像がここに表示されます</p>
  </div>

  <script>
    const form = document.getElementById('renderForm');
    const preview = document.getElementById('preview');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // エラー・成功メッセージをクリア
      errorMsg.style.display = 'none';
      successMsg.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = '生成中...';

      try {
        const apiKey = document.getElementById('apiKey').value;
        const title = document.getElementById('title').value;
        const subtitle = document.getElementById('subtitle').value;
        const brand = document.getElementById('brand').value;
        const format = document.getElementById('format').value;
        const width = parseInt(document.getElementById('width').value);
        const height = parseInt(document.getElementById('height').value);
        const textColor = document.getElementById('textColor').value;
        const bgColor = document.getElementById('bgColor').value;
        const coverImage = document.getElementById('coverImage').value;
        const coverOpacity = parseFloat(document.getElementById('coverOpacity').value);
        const coverFit = document.getElementById('coverFit').value;

        const requestBody = {
          template: 'magazine-basic',
          format,
          width,
          height,
          data: {
            title,
            subtitle: subtitle || undefined,
            brand: brand || undefined,
            textColor,
            bgColor,
            cover: coverImage ? {
              image_url: coverImage,
              opacity: coverOpacity,
              fit: coverFit
            } : undefined
          }
        };

        const response = await fetch('/render', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(\`エラー: \${response.status} \${response.statusText} - \${errorText}\`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        if (format === 'svg') {
          preview.innerHTML = \`<object type="image/svg+xml" data="\${imageUrl}" style="max-width: 100%;"></object>\`;
        } else {
          preview.innerHTML = \`<img src="\${imageUrl}" alt="生成された画像" />\`;
        }

        successMsg.textContent = '画像が正常に生成されました！';
        successMsg.style.display = 'block';

      } catch (error) {
        console.error('Error:', error);
        errorMsg.textContent = error.message || 'ネットワークエラーが発生しました。開発サーバーが起動しているか確認してください。';
        errorMsg.style.display = 'block';
        preview.innerHTML = '<p style="color: #999;">生成された画像がここに表示されます</p>';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '画像を生成';
      }
    });
  </script>
</body>
</html>
  `;
}
