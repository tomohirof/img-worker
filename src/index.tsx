/* Cloudflare Workers + Hono + Satori + resvg-wasm */
import React from 'react'
import { Hono } from 'hono'
import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import wasmModule from '../node_modules/@resvg/resvg-wasm/index_bg.wasm'
// @ts-ignore
import fontSansData from '../assets/fonts/NotoSansJP-Regular.ttf'
// @ts-ignore
import fontSerifData from '../assets/fonts/NotoSerifJP-Bold.ttf'

type Env = {
  API_KEY: string
}

// WASM初期化フラグ
let wasmInitialized = false

// WASMを初期化（一度だけ）
async function ensureWasmInitialized() {
  if (!wasmInitialized) {
    await initWasm(wasmModule)
    wasmInitialized = true
  }
}

const app = new Hono<{ Bindings: Env }>()
async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('failed to fetch image')
  const buf = await res.arrayBuffer()
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
  const ct = res.headers.get('content-type') || 'image/png'
  return `data:${ct};base64,${b64}`
}
type RenderInput = {
  template?: string
  format?: 'png' | 'svg'
  width?: number
  height?: number
  data: {
    title: string
    subtitle?: string
    brand?: string
    textColor?: string
    bgColor?: string
    cover?: { image_url: string; opacity?: number; fit?: 'cover' | 'contain' }
  }
}
async function templateMagazineBasic(input: Required<RenderInput>) {
  const { width, height, data } = input
  const { title, subtitle = '', brand = 'SIXONE MAGAZINE', textColor = '#111', bgColor = '#f9f7f4', cover } = data
  let coverDataUrl: string | null = null
  if (cover?.image_url) try { coverDataUrl = await toDataUrl(cover.image_url) } catch {}

  const jsx = (
    <div style={{ width, height, background: bgColor, color: textColor, display: 'flex',
      flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 96 }}>
      <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, fontFamily: 'Noto Serif JP' }}>{title}</div>
      <div style={{ display: 'flex', marginTop: 32, fontSize: 36, fontFamily: 'Noto Sans JP' }}>{subtitle || brand}</div>
    </div>
  )
  const svg = await satori(jsx as any, {
    width,
    height,
    fonts: [
      { name: 'Noto Sans JP', data: fontSansData, weight: 400, style: 'normal' },
      { name: 'Noto Serif JP', data: fontSerifData, weight: 700, style: 'normal' }
    ],
  })
  return svg
}
function requireApiKey(c: any) {
  const q = c.req.query('api_key')
  const h = c.req.header('x-api-key')
  const provided = h || q
  if (!provided || provided !== c.env.API_KEY) return c.text('Unauthorized', 401)
  return null
}
app.get('/', (c) => c.text('ok'))

app.get('/form', (c) => {
  const html = `
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
          throw new Error(\`エラー: \${response.status} \${response.statusText}\`);
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

        // フォームをリセット（APIキーは保持）
        const savedApiKey = apiKey;
        form.reset();
        document.getElementById('apiKey').value = savedApiKey;

      } catch (error) {
        errorMsg.textContent = error.message;
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
  return c.html(html);
})

app.post('/render', async (c) => {
  const unauthorized = requireApiKey(c)
  if (unauthorized) return unauthorized
  const body = (await c.req.json()) as RenderInput
  const format = body.format || 'png'
  const width = Math.max(200, Math.min(4096, body.width ?? 1200))
  const height = Math.max(200, Math.min(4096, body.height ?? 630))
  const input: Required<RenderInput> = {
    template: body.template || 'magazine-basic',
    format, width, height,
    data: { title: body.data.title, subtitle: body.data.subtitle, brand: body.data.brand,
      textColor: body.data.textColor, bgColor: body.data.bgColor, cover: body.data.cover }
  }
  const svg = await templateMagazineBasic(input)
  if (format === 'svg') return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
  await ensureWasmInitialized()
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
  const png = resvg.render().asPng()
  return new Response(png, { headers: { 'Content-Type': 'image/png' } })
})
export default app
