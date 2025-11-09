/* Cloudflare Workers + Hono + Satori + resvg-wasm */
import React from 'react'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import wasmModule from '../node_modules/@resvg/resvg-wasm/index_bg.wasm'
import authApp from './auth/routes'
import apiKeysApp from './api-keys/routes'
import { requireApiKeyAuth } from './middleware/api-auth'
import type { Bindings } from './types'

// 後方互換性のためのエイリアス
type Env = Bindings

// Template types
interface TextElement {
  id: string
  variable: string  // e.g., "title", "category"
  x: number
  y: number
  width?: number
  height?: number
  maxWidth?: number  // Maximum width for text wrapping
  maxHeight?: number  // Maximum height for text (triggers font size adjustment)
  fontSize: number
  minFontSize?: number  // Minimum font size when auto-adjusting (default: fontSize / 2)
  fontFamily: 'Noto Sans JP' | 'Noto Serif JP'
  color: string
  fontWeight: 400 | 700
  textAlign: 'left' | 'center' | 'right'
}

interface Template {
  id: string
  name: string
  width: number
  height: number
  background: {
    type: 'color' | 'image' | 'upload'
    value: string  // color code or image URL
  }
  elements: TextElement[]
  thumbnailUrl?: string  // サムネイル画像のURL
  createdAt: string
  updatedAt: string
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

// フォントキャッシュ
let fontSansData: ArrayBuffer | null = null
let fontSerifData: ArrayBuffer | null = null

// Google Fonts APIからフォントを読み込む
async function loadFont(family: string, weight: number): Promise<ArrayBuffer> {
  // Google Fonts CSS APIを使ってフォントURLを取得
  const familyParam = family.replace(/ /g, '+')
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}&display=swap`

  const cssResponse = await fetch(cssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  if (!cssResponse.ok) {
    throw new Error(`Failed to fetch font CSS for ${family}`)
  }

  const css = await cssResponse.text()

  // CSSからフォントファイルのURLを抽出
  const urlMatch = css.match(/url\(([^)]+)\)/)
  if (!urlMatch) {
    throw new Error(`Failed to extract font URL from CSS for ${family}`)
  }

  const fontUrl = urlMatch[1]

  // フォントファイルをダウンロード
  const fontResponse = await fetch(fontUrl)
  if (!fontResponse.ok) {
    throw new Error(`Failed to fetch font file for ${family}`)
  }

  return await fontResponse.arrayBuffer()
}

// フォントを初期化（一度だけ読み込み）
async function ensureFontsLoaded() {
  if (!fontSansData) {
    fontSansData = await loadFont('Noto Sans JP', 400)
  }
  if (!fontSerifData) {
    fontSerifData = await loadFont('Noto Serif JP', 700)
  }
}

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('/*', cors({
  origin: (origin) => {
    // ローカル開発環境
    if (origin === 'http://localhost:3000' || origin === 'http://localhost:3002' || origin === 'http://localhost:1033') {
      return origin;
    }

    // Cloudflare Pages（本番とプレビュー）
    if (origin && (origin.endsWith('.img-worker-templates.pages.dev') ||
        origin === 'https://img-worker-templates.pages.dev')) {
      return origin;
    }

    // 許可されていないoriginの場合
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// 認証ルート
app.route('/auth', authApp)
app.route('/api-keys', apiKeysApp)
async function toDataUrl(url: string, env?: Bindings): Promise<string> {
  // Check if URL is a local image URL (e.g., http://localhost:8008/images/uploads/...)
  // or production image URL (e.g., https://ogp-worker.tomohirof.workers.dev/images/uploads/...)
  const imagePathMatch = url.match(/\/images\/(.+)$/);

  if (imagePathMatch && env?.IMAGES) {
    // Extract the key (e.g., "uploads/xxx.jpg")
    const key = imagePathMatch[1];

    try {
      // Fetch from R2 directly
      const object = await env.IMAGES.get(key);

      if (!object) {
        throw new Error(`Image not found in R2: ${key}`);
      }

      const buf = await object.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const ct = object.httpMetadata?.contentType || 'image/png';
      return `data:${ct};base64,${b64}`;
    } catch (error) {
      console.error('Failed to fetch image from R2:', error);
      throw error;
    }
  }

  // For external URLs, use fetch as before
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to fetch image');
  const buf = await res.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const ct = res.headers.get('content-type') || 'image/png';
  return `data:${ct};base64,${b64}`;
}
type RenderInput = {
  template?: string | Template  // 'magazine-basic' or template object for preview
  templateId?: string  // Template ID from KV
  format?: 'png' | 'svg'
  width?: number
  height?: number
  data: Record<string, string> | {
    title: string
    subtitle?: string
    brand?: string
    textColor?: string
    bgColor?: string
    cover?: { image_url: string; opacity?: number; fit?: 'cover' | 'contain' }
  }
}
// Render template to SVG using Satori
async function renderTemplateToSvg(template: Template, data: Record<string, string>, env?: Bindings): Promise<string> {
  const { width, height, background, elements } = template

  // Convert background image URL to Data URL if needed
  let backgroundValue = background.value
  let effectiveBackgroundType = background.type

  if ((background.type === 'image' || background.type === 'upload') && background.value) {
    try {
      backgroundValue = await toDataUrl(background.value, env)
    } catch (error) {
      console.error('Failed to convert background image to Data URL:', error)
      // Fallback to white background if image fails to load
      backgroundValue = '#ffffff'
      effectiveBackgroundType = 'color'
    }
  } else if ((background.type === 'image' || background.type === 'upload') && !background.value) {
    // If no image URL is provided, use white background
    backgroundValue = '#ffffff'
    effectiveBackgroundType = 'color'
  }

  // Create JSX elements from template definition
  const jsxElements = elements.map(el => {
    const value = data[el.variable] || ''

    // Calculate adjusted font size if maxHeight is specified
    let adjustedFontSize = el.fontSize
    if (el.maxWidth && el.maxHeight) {
      // Estimate number of lines
      // Rough estimation: average character width is ~0.5 * fontSize
      const avgCharWidth = el.fontSize * 0.5
      const charsPerLine = Math.floor(el.maxWidth / avgCharWidth)
      const estimatedLines = Math.ceil(value.length / charsPerLine)

      // Line height is typically 1.2 * fontSize
      const lineHeight = 1.2
      const estimatedHeight = estimatedLines * el.fontSize * lineHeight

      // If estimated height exceeds maxHeight, reduce font size
      if (estimatedHeight > el.maxHeight) {
        const ratio = el.maxHeight / estimatedHeight
        adjustedFontSize = Math.floor(el.fontSize * ratio)

        // Don't go below minFontSize
        const minSize = el.minFontSize || Math.floor(el.fontSize / 2)
        adjustedFontSize = Math.max(adjustedFontSize, minSize)
      }
    }

    // Build style object with text wrapping support
    const style: any = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      fontSize: adjustedFontSize,
      fontFamily: el.fontFamily,
      color: el.color,
      fontWeight: el.fontWeight,
      textAlign: 'left',  // Always use left alignment for simplicity
      display: 'flex',
      lineHeight: 1.2,  // Standard line height
    }

    // Add width and wrapping if maxWidth is specified
    if (el.maxWidth) {
      style.width = el.maxWidth
      style.flexWrap = 'wrap'
      style.wordBreak = 'break-word'  // Allow breaking long words
    }

    return (
      <div key={el.id} style={style}>
        {value}
      </div>
    )
  })

  const jsx = (
    <div
      style={{
        width,
        height,
        background: effectiveBackgroundType === 'color' ? backgroundValue : `url(${backgroundValue})`,
        display: 'flex',
        position: 'relative',
      }}
    >
      {jsxElements}
    </div>
  )

  // フォントを読み込み
  await ensureFontsLoaded()

  const svg = await satori(jsx as any, {
    width,
    height,
    fonts: [
      { name: 'Noto Sans JP', data: fontSansData!, weight: 400, style: 'normal' },
      { name: 'Noto Serif JP', data: fontSerifData!, weight: 700, style: 'normal' }
    ],
  })

  return svg
}

async function templateMagazineBasic(input: Required<RenderInput>, env?: Bindings) {
  const { width, height, data } = input
  const { title, subtitle = '', brand = 'SIXONE MAGAZINE', textColor = '#111', bgColor = '#f9f7f4', cover } = data
  let coverDataUrl: string | null = null
  if (cover?.image_url) try { coverDataUrl = await toDataUrl(cover.image_url, env) } catch {}

  const jsx = (
    <div style={{ width, height, background: bgColor, color: textColor, display: 'flex',
      flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 96 }}>
      <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, fontFamily: 'Noto Serif JP' }}>{title}</div>
      <div style={{ display: 'flex', marginTop: 32, fontSize: 36, fontFamily: 'Noto Sans JP' }}>{subtitle || brand}</div>
    </div>
  )
  // フォントを読み込み
  await ensureFontsLoaded()

  const svg = await satori(jsx as any, {
    width,
    height,
    fonts: [
      { name: 'Noto Sans JP', data: fontSansData!, weight: 400, style: 'normal' },
      { name: 'Noto Serif JP', data: fontSerifData!, weight: 700, style: 'normal' }
    ],
  })
  return svg
}
/**
 * APIキー認証（後方互換性のため環境変数もサポート）
 * ユーザー固有のAPIキーを優先し、見つからなければ環境変数のAPI_KEYもチェック
 */
async function requireApiKey(c: any) {
  const q = c.req.query('api_key')
  const h = c.req.header('x-api-key')
  const provided = h || q

  if (!provided) {
    return c.text('Unauthorized: API key required', 401)
  }

  // まずユーザー固有のAPIキーをチェック
  const { validateApiKey } = await import('./api-keys/api-key')
  try {
    const apiKeyData = await validateApiKey(c.env.TEMPLATES, provided)
    if (apiKeyData) {
      // 有効なユーザーAPIキーが見つかった
      c.set('apiUserId', apiKeyData.userId)
      return null
    }
  } catch (error) {
    console.error('API key validation error:', error)
  }

  // フォールバック: 環境変数のAPI_KEYと比較（後方互換性）
  if (c.env.API_KEY && provided === c.env.API_KEY) {
    return null
  }

  return c.text('Unauthorized: Invalid API key', 401)
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
      <input type="password" id="apiKey" required placeholder="APIキーを入力してください" value="cwe8yxq4mtc-HCZ9ebm">
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
  return c.html(html);
})

app.post('/render', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const body = (await c.req.json()) as RenderInput
  const format = body.format || 'png'

  let svg: string

  // Check if template object is provided directly (for preview)
  if (body.template && typeof body.template === 'object') {
    const template = body.template as Template
    svg = await renderTemplateToSvg(template, body.data as Record<string, string>, c.env)
  }
  // Check if using template ID from KV
  else if (body.templateId) {
    // Load template from KV
    const template = await c.env.TEMPLATES.get(`template:${body.templateId}`, 'json') as Template
    if (!template) {
      return c.json({ error: 'Template not found' }, 404)
    }

    // Render using template
    svg = await renderTemplateToSvg(template, body.data as Record<string, string>, c.env)
  }
  // Check if using template name
  else if (body.template && typeof body.template === 'string' && body.template !== 'magazine-basic') {
    // Search for template by name
    const keys = await c.env.TEMPLATES.list({ prefix: 'template:' })
    let foundTemplate: Template | null = null

    for (const key of keys.keys) {
      const template = await c.env.TEMPLATES.get(key.name, 'json') as Template
      if (template && template.name === body.template) {
        foundTemplate = template
        break
      }
    }

    if (!foundTemplate) {
      return c.json({ error: `Template '${body.template}' not found` }, 404)
    }

    // Render using template
    svg = await renderTemplateToSvg(foundTemplate, body.data as Record<string, string>, c.env)
  }
  // Use legacy magazine-basic template
  else {
    const width = Math.max(200, Math.min(4096, body.width ?? 1200))
    const height = Math.max(200, Math.min(4096, body.height ?? 630))
    const input: Required<RenderInput> = {
      template: (body.template as string) || 'magazine-basic',
      format, width, height,
      data: body.data as any
    }
    svg = await templateMagazineBasic(input, c.env)
  }

  if (format === 'svg') return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })

  await ensureWasmInitialized()
  const resvg = new Resvg(svg)
  const png = resvg.render().asPng()
  return new Response(png, { headers: { 'Content-Type': 'image/png' } })
})

// Image Upload APIs

// POST /images/upload - Upload image to R2
app.post('/images/upload', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  try {
    // Parse multipart/form-data
    const formData = await c.req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // File size limit (10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return c.json({ error: 'File too large (max 10MB)' }, 400)
    }

    // MIME type validation
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Allowed: png, jpeg, gif, webp, svg' }, 400)
    }

    // Generate unique filename
    const fileId = crypto.randomUUID()
    const extension = file.name.split('.').pop() || 'png'
    const key = `uploads/${fileId}.${extension}`

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    await c.env.IMAGES.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        size: file.size.toString(),
      }
    })

    // Return public URL
    // Use PUBLIC_IMAGE_BASE_URL if available (for production), otherwise use request origin (for local dev)
    const baseUrl = c.env.PUBLIC_IMAGE_BASE_URL || new URL(c.req.url).origin
    const url = `${baseUrl}/images/${key}`

    return c.json({
      success: true,
      fileId,
      key,
      url,
      size: file.size,
      type: file.type,
    }, 201)

  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

// GET /images/:key - Get image from R2
app.get('/images/*', async (c) => {
  const key = c.req.path.replace('/images/', '')

  const object = await c.env.IMAGES.get(key)

  if (!object) {
    return c.json({ error: 'Image not found' }, 404)
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': object.httpEtag,
    }
  })
})

// DELETE /images/:key - Delete image from R2
app.delete('/images/*', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const key = c.req.path.replace('/images/', '')

  await c.env.IMAGES.delete(key)

  return c.json({ success: true })
})

// Template Management APIs

// GET /templates/ui - Template management UI
app.get('/templates/ui', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>テンプレート管理</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 1200px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1 { color: #333; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    button:hover { background: #0056b3; }
    button.danger { background: #dc3545; }
    button.danger:hover { background: #c82333; }
    .templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .template-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: white; }
    .template-card h3 { margin: 0 0 10px 0; color: #333; }
    .template-card p { margin: 5px 0; color: #666; font-size: 14px; }
    .template-actions { margin-top: 15px; display: flex; gap: 10px; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 1000; }
    .modal.active { display: flex; }
    .modal-content { background: white; padding: 30px; border-radius: 8px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; }
    input, textarea { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: monospace; }
    textarea { min-height: 400px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .error { color: #dc3545; margin-top: 10px; padding: 10px; background: #f8d7da; border-radius: 4px; display: none; }
    .success { color: #155724; margin-top: 10px; padding: 10px; background: #d4edda; border-radius: 4px; display: none; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>テンプレート管理</h1>
    <button onclick="window.location.href='/templates/editor'">ビジュアルエディタで新規作成</button>
    <button onclick="showCreateModal()" class="secondary" style="background: #6c757d;">JSON形式で新規作成</button>
  </div>

  <div class="error" id="errorMsg"></div>
  <div class="success" id="successMsg"></div>

  <div class="templates-grid" id="templatesGrid">
    <p>読み込み中...</p>
  </div>

  <!-- Create/Edit Modal -->
  <div class="modal" id="templateModal">
    <div class="modal-content">
      <h2 id="modalTitle">新規テンプレート作成</h2>

      <div class="form-group">
        <label for="templateName">テンプレート名</label>
        <input type="text" id="templateName" placeholder="例: Tutorial Template">
      </div>

      <div class="form-group">
        <label for="templateJson">テンプレート定義（JSON）</label>
        <textarea id="templateJson" placeholder='{\n  "width": 1200,\n  "height": 630,\n  "background": { "type": "color", "value": "#1e40ff" },\n  "elements": [\n    {\n      "id": "title",\n      "variable": "title",\n      "x": 100,\n      "y": 300,\n      "maxWidth": 1000,\n      "maxHeight": 250,\n      "fontSize": 72,\n      "minFontSize": 36,\n      "fontFamily": "Noto Serif JP",\n      "color": "#ffffff",\n      "fontWeight": 700,\n      "textAlign": "left"\n    },\n    {\n      "id": "category",\n      "variable": "category",\n      "x": 100,\n      "y": 200,\n      "maxWidth": 800,\n      "maxHeight": 80,\n      "fontSize": 24,\n      "fontFamily": "Noto Sans JP",\n      "color": "#ffff00",\n      "fontWeight": 400,\n      "textAlign": "left"\n    }\n  ]\n}'></textarea>
      </div>

      <div class="modal-actions">
        <button onclick="closeModal()" style="background: #6c757d;">キャンセル</button>
        <button onclick="saveTemplate()">保存</button>
      </div>
    </div>
  </div>

  <script>
    const API_KEY = 'cwe8yxq4mtc-HCZ9ebm';
    let templates = [];
    let editingTemplateId = null;

    async function loadTemplates() {
      try {
        const response = await fetch('/templates', {
          headers: { 'x-api-key': API_KEY }
        });

        if (!response.ok) throw new Error('テンプレートの読み込みに失敗しました');

        templates = await response.json();
        renderTemplates();
      } catch (error) {
        showError(error.message);
      }
    }

    function renderTemplates() {
      const grid = document.getElementById('templatesGrid');

      if (templates.length === 0) {
        grid.innerHTML = '<p>テンプレートがありません。新規作成してください。</p>';
        return;
      }

      grid.innerHTML = templates.map(template => \`
        <div class="template-card">
          <h3>\${template.name}</h3>
          <p><strong>サイズ:</strong> \${template.width}x\${template.height}px</p>
          <p><strong>要素数:</strong> \${template.elements.length}</p>
          <p><strong>作成日:</strong> \${new Date(template.createdAt).toLocaleString('ja-JP')}</p>
          <div class="template-actions">
            <button onclick="window.location.href='/templates/editor?id=\${template.id}'">ビジュアル編集</button>
            <button onclick="editTemplate('\${template.id}')" style="background: #6c757d;">JSON編集</button>
            <button class="danger" onclick="deleteTemplate('\${template.id}')">削除</button>
          </div>
        </div>
      \`).join('');
    }

    function showCreateModal() {
      editingTemplateId = null;
      document.getElementById('modalTitle').textContent = '新規テンプレート作成';
      document.getElementById('templateName').value = '';
      document.getElementById('templateJson').value = '';
      document.getElementById('templateModal').classList.add('active');
    }

    function viewTemplate(id) {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      alert(\`テンプレート詳細:\\n\${JSON.stringify(template, null, 2)}\`);
    }

    function editTemplate(id) {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      editingTemplateId = id;
      document.getElementById('modalTitle').textContent = 'テンプレート編集';
      document.getElementById('templateName').value = template.name;

      const { id: _, createdAt, updatedAt, ...templateData } = template;
      document.getElementById('templateJson').value = JSON.stringify(templateData, null, 2);

      document.getElementById('templateModal').classList.add('active');
    }

    async function saveTemplate() {
      try {
        const name = document.getElementById('templateName').value.trim();
        const jsonText = document.getElementById('templateJson').value.trim();

        if (!name) throw new Error('テンプレート名を入力してください');
        if (!jsonText) throw new Error('テンプレート定義を入力してください');

        let templateData;
        try {
          templateData = JSON.parse(jsonText);
        } catch {
          throw new Error('JSON形式が正しくありません');
        }

        templateData.name = name;

        const url = editingTemplateId ? \`/templates/\${editingTemplateId}\` : '/templates';
        const method = editingTemplateId ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify(templateData)
        });

        if (!response.ok) throw new Error('保存に失敗しました');

        showSuccess(editingTemplateId ? 'テンプレートを更新しました' : 'テンプレートを作成しました');
        closeModal();
        await loadTemplates();
      } catch (error) {
        showError(error.message);
      }
    }

    async function deleteTemplate(id) {
      if (!confirm('このテンプレートを削除しますか？')) return;

      try {
        const response = await fetch(\`/templates/\${id}\`, {
          method: 'DELETE',
          headers: { 'x-api-key': API_KEY }
        });

        if (!response.ok) throw new Error('削除に失敗しました');

        showSuccess('テンプレートを削除しました');
        await loadTemplates();
      } catch (error) {
        showError(error.message);
      }
    }

    function closeModal() {
      document.getElementById('templateModal').classList.remove('active');
    }

    function showError(message) {
      const errorMsg = document.getElementById('errorMsg');
      errorMsg.textContent = message;
      errorMsg.style.display = 'block';
      setTimeout(() => { errorMsg.style.display = 'none'; }, 5000);
    }

    function showSuccess(message) {
      const successMsg = document.getElementById('successMsg');
      successMsg.textContent = message;
      successMsg.style.display = 'block';
      setTimeout(() => { successMsg.style.display = 'none'; }, 3000);
    }

    // Load templates on page load
    loadTemplates();
  </script>
</body>
</html>
  `;
  return c.html(html);
})

// GET /templates/editor - Visual template editor (new template)
app.get('/templates/editor', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ビジュアルエディタ - 新規テンプレート</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; height: 100vh; overflow: hidden; }

    .editor-container { display: flex; height: 100vh; }
    .canvas-area { flex: 1; background: #f5f5f5; position: relative; overflow: auto; }
    .properties-panel { width: 350px; background: white; border-left: 1px solid #ddd; overflow-y: auto; padding: 20px; }

    .toolbar { background: white; border-bottom: 1px solid #ddd; padding: 15px 20px; display: flex; gap: 10px; align-items: center; }
    .toolbar h1 { font-size: 18px; flex: 1; }
    .toolbar button { background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .toolbar button:hover { background: #0056b3; }
    .toolbar button.secondary { background: #6c757d; }
    .toolbar button.secondary:hover { background: #5a6268; }

    .canvas { position: relative; margin: 40px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: default; }
    .text-element { position: absolute; cursor: move; border: 2px solid transparent; padding: 4px; user-select: none; font-family: 'Noto Sans JP', sans-serif; white-space: pre-wrap; word-break: break-word; line-height: 1.2; }
    .text-element:hover { border-color: #007bff; background: rgba(0,123,255,0.05); }
    .text-element.selected { border-color: #007bff; background: rgba(0,123,255,0.1); }
    .text-element .resize-handle { position: absolute; right: -6px; bottom: -6px; width: 12px; height: 12px; background: #007bff; border: 2px solid white; border-radius: 50%; cursor: nwse-resize; display: none; }
    .text-element.selected .resize-handle { display: block; }

    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; font-size: 13px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .form-group input[type="number"] { width: 100%; }
    .form-group input[type="color"] { height: 40px; cursor: pointer; }
    .form-group .input-row { display: flex; gap: 10px; }
    .form-group .input-row > * { flex: 1; }

    .section-title { font-size: 16px; font-weight: 700; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #007bff; color: #333; }
    .section-title:first-child { margin-top: 0; }

    .no-selection { color: #999; font-style: italic; padding: 40px 20px; text-align: center; }

    .bg-preview { width: 100%; height: 100px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px; background-size: cover; background-position: center; }

    .upload-area {
      width: 100%;
      min-height: 150px;
      border: 2px dashed #007bff;
      border-radius: 8px;
      margin-top: 10px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #f8f9fa;
    }
    .upload-area:hover { background: #e9ecef; border-color: #0056b3; }
    .upload-area.dragover { background: #cfe2ff; border-color: #0056b3; border-style: solid; }
    .upload-area .icon { font-size: 48px; margin-bottom: 10px; color: #007bff; }
    .upload-area .text { font-size: 14px; color: #666; margin-bottom: 5px; }
    .upload-area .subtext { font-size: 12px; color: #999; }
    .upload-area .preview-image { width: 100%; max-height: 200px; object-fit: contain; margin-top: 10px; border-radius: 4px; }
    .upload-area.uploading { opacity: 0.6; pointer-events: none; }

    button.danger { background: #dc3545; }
    button.danger:hover { background: #c82333; }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1 id="pageTitle">ビジュアルエディタ - 新規テンプレート</h1>
    <button onclick="addTextElement()" class="secondary">テキスト要素を追加</button>
    <button onclick="previewTemplate()" class="secondary">プレビュー</button>
    <button onclick="saveTemplate()">保存</button>
    <button onclick="window.location.href='/templates/ui'" class="secondary">戻る</button>
  </div>

  <div class="editor-container">
    <div class="canvas-area">
      <div id="canvas" class="canvas"></div>
    </div>

    <div class="properties-panel" id="propertiesPanel">
      <div class="no-selection">
        左側のキャンバスで要素を選択するか、<br>「テキスト要素を追加」ボタンをクリックしてください
      </div>
    </div>
  </div>

  <script>
    const API_KEY = 'cwe8yxq4mtc-HCZ9ebm';

    // State
    let templateState = {
      id: null,
      name: '',
      width: 1200,
      height: 630,
      background: { type: 'color', value: '#1e40ff' },
      elements: []
    };

    let selectedElementId = null;
    let dragState = null;

    // Initialize
    initializeEditor();

    function initializeEditor() {
      // Check if editing existing template
      const urlParams = new URLSearchParams(window.location.search);
      const templateId = urlParams.get('id');

      if (templateId) {
        loadTemplate(templateId);
      } else {
        renderCanvas();
        showTemplateProperties();
      }
    }

    async function loadTemplate(id) {
      try {
        const response = await fetch(\`/templates/\${id}\`, {
          headers: { 'x-api-key': API_KEY }
        });

        if (!response.ok) throw new Error('テンプレートの読み込みに失敗しました');

        const template = await response.json();
        templateState = template;

        document.getElementById('pageTitle').textContent = \`ビジュアルエディタ - \${template.name}\`;
        renderCanvas();
        showTemplateProperties();
      } catch (error) {
        alert(error.message);
        window.location.href = '/templates/ui';
      }
    }

    function renderCanvas() {
      const canvas = document.getElementById('canvas');
      const { width, height, background, elements } = templateState;

      // Set canvas size and background
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      if (background.type === 'color') {
        canvas.style.background = background.value;
        canvas.style.backgroundImage = 'none';
      } else if (background.type === 'image' || background.type === 'upload') {
        canvas.style.backgroundImage = \`url(\${background.value})\`;
        canvas.style.backgroundSize = 'cover';
        canvas.style.backgroundPosition = 'center';
      } else {
        canvas.style.background = '#ffffff';
        canvas.style.backgroundImage = 'none';
      }

      // Clear and render elements
      canvas.innerHTML = '';

      elements.forEach(element => {
        const div = document.createElement('div');
        div.className = 'text-element';
        if (element.id === selectedElementId) div.classList.add('selected');
        div.dataset.id = element.id;
        div.textContent = \`[\${element.variable}]\`;

        div.style.left = element.x + 'px';
        div.style.top = element.y + 'px';
        div.style.fontSize = element.fontSize + 'px';
        div.style.fontFamily = element.fontFamily;
        div.style.color = element.color;
        div.style.fontWeight = element.fontWeight;
        div.style.textAlign = element.textAlign;

        if (element.maxWidth) {
          div.style.width = element.maxWidth + 'px';
        }

        if (element.maxHeight) {
          div.style.height = element.maxHeight + 'px';
        }

        // Add resize handle
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        div.appendChild(handle);

        // Click to select
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          selectElement(element.id);
        });

        // Drag to move
        div.addEventListener('pointerdown', (e) => {
          if (e.target.classList.contains('resize-handle')) {
            startResize(e, element.id);
          } else {
            startDrag(e, element.id);
          }
        });

        canvas.appendChild(div);
      });
    }

    function selectElement(id) {
      selectedElementId = id;
      renderCanvas();
      showElementProperties();
    }

    function deselectElement() {
      selectedElementId = null;
      renderCanvas();
      showTemplateProperties();
    }

    // Click canvas to deselect
    document.getElementById('canvas').addEventListener('click', (e) => {
      if (e.target.id === 'canvas') {
        deselectElement();
      }
    });

    function startDrag(e, elementId) {
      e.preventDefault();
      selectElement(elementId);

      const element = templateState.elements.find(el => el.id === elementId);
      const canvasRect = document.getElementById('canvas').getBoundingClientRect();

      dragState = {
        type: 'move',
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        initialX: element.x,
        initialY: element.y
      };

      document.addEventListener('pointermove', onDragMove);
      document.addEventListener('pointerup', onDragEnd);
    }

    function startResize(e, elementId) {
      e.preventDefault();
      e.stopPropagation();
      selectElement(elementId);

      const element = templateState.elements.find(el => el.id === elementId);

      dragState = {
        type: 'resize',
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        initialWidth: element.maxWidth || 200,
        initialHeight: element.maxHeight || 100
      };

      document.addEventListener('pointermove', onDragMove);
      document.addEventListener('pointerup', onDragEnd);
    }

    function onDragMove(e) {
      if (!dragState) return;

      const element = templateState.elements.find(el => el.id === dragState.elementId);

      if (dragState.type === 'move') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        element.x = Math.max(0, Math.min(templateState.width - 50, dragState.initialX + dx));
        element.y = Math.max(0, Math.min(templateState.height - 20, dragState.initialY + dy));
      } else if (dragState.type === 'resize') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        element.maxWidth = Math.max(50, dragState.initialWidth + dx);
        element.maxHeight = Math.max(20, dragState.initialHeight + dy);
      }

      renderCanvas();
      if (selectedElementId) showElementProperties();
    }

    function onDragEnd(e) {
      dragState = null;
      document.removeEventListener('pointermove', onDragMove);
      document.removeEventListener('pointerup', onDragEnd);
    }

    function addTextElement() {
      const newElement = {
        id: 'el_' + Date.now(),
        variable: 'text' + (templateState.elements.length + 1),
        x: 100,
        y: 100 + (templateState.elements.length * 50),
        fontSize: 32,
        fontFamily: 'Noto Sans JP',
        color: '#ffffff',
        fontWeight: 400,
        textAlign: 'left',
        maxWidth: 800,
        maxHeight: 200,
        minFontSize: 16
      };

      templateState.elements.push(newElement);
      selectElement(newElement.id);
    }

    function deleteSelectedElement() {
      if (!selectedElementId) return;
      if (!confirm('この要素を削除しますか？')) return;

      templateState.elements = templateState.elements.filter(el => el.id !== selectedElementId);
      deselectElement();
    }

    function showTemplateProperties() {
      const panel = document.getElementById('propertiesPanel');
      const { name, width, height, background } = templateState;

      panel.innerHTML = \`
        <div class="section-title">テンプレート設定</div>

        <div class="form-group">
          <label>テンプレート名</label>
          <input type="text" id="templateName" value="\${name}" placeholder="例: Tutorial Template" onchange="updateTemplateProperty('name', this.value)">
        </div>

        <div class="form-group">
          <label>サイズ（幅 x 高さ）</label>
          <div class="input-row">
            <input type="number" id="templateWidth" value="\${width}" min="200" max="4096" onchange="updateCanvasSize()">
            <input type="number" id="templateHeight" value="\${height}" min="200" max="4096" onchange="updateCanvasSize()">
          </div>
        </div>

        <div class="form-group">
          <label>背景タイプ</label>
          <select id="bgType" onchange="updateBackgroundType(this.value)">
            <option value="color" \${background.type === 'color' ? 'selected' : ''}>カラー</option>
            <option value="image" \${background.type === 'image' ? 'selected' : ''}>画像URL</option>
            <option value="upload" \${background.type === 'upload' ? 'selected' : ''}>画像アップロード</option>
          </select>
        </div>

        <div class="form-group" id="bgValueGroup">
          \${background.type === 'color' ?
            \`<label>背景色</label><input type="color" value="\${background.value}" onchange="updateTemplateProperty('background', {type: 'color', value: this.value})">\` :
            background.type === 'image' ?
            \`<label>画像URL</label><input type="text" value="\${background.value}" placeholder="https://example.com/image.jpg" onchange="updateTemplateProperty('background', {type: 'image', value: this.value})">
             \${background.value ? \`<div class="bg-preview" style="background-image: url('\${background.value}')"></div>\` : ''}\` :
            \`<label>画像をアップロード</label>
             <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
               \${background.value ?
                 \`<img src="\${background.value}" class="preview-image" alt="プレビュー" />
                  <div class="text">クリックまたはドラッグ&ドロップで画像を変更</div>\` :
                 \`<div class="icon">📤</div>
                  <div class="text">クリックまたはドラッグ&ドロップで画像をアップロード</div>
                  <div class="subtext">PNG, JPEG, GIF, WebP, SVG (最大10MB)</div>\`
               }
             </div>
             <input type="file" id="fileInput" accept="image/*" style="display: none;" onchange="handleBackgroundUpload(event)" />\`
          }
        </div>
      \`;

      // ドラッグ&ドロップイベントハンドラーを設定
      setupUploadAreaHandlers();
    }

    function showElementProperties() {
      const element = templateState.elements.find(el => el.id === selectedElementId);
      if (!element) return;

      const panel = document.getElementById('propertiesPanel');

      panel.innerHTML = \`
        <div class="section-title">テキスト要素</div>

        <div class="form-group">
          <label>変数名</label>
          <input type="text" value="\${element.variable}" onchange="updateElementProperty('variable', this.value)">
        </div>

        <div class="form-group">
          <label>位置（X, Y）</label>
          <div class="input-row">
            <input type="number" value="\${element.x}" min="0" max="\${templateState.width}" onchange="updateElementProperty('x', parseInt(this.value))">
            <input type="number" value="\${element.y}" min="0" max="\${templateState.height}" onchange="updateElementProperty('y', parseInt(this.value))">
          </div>
        </div>

        <div class="form-group">
          <label>フォントサイズ</label>
          <input type="number" value="\${element.fontSize}" min="8" max="200" onchange="updateElementProperty('fontSize', parseInt(this.value))">
        </div>

        <div class="form-group">
          <label>最小フォントサイズ（自動調整時）</label>
          <input type="number" value="\${element.minFontSize || Math.floor(element.fontSize / 2)}" min="8" max="200" onchange="updateElementProperty('minFontSize', parseInt(this.value))">
        </div>

        <div class="form-group">
          <label>フォントファミリー</label>
          <select value="\${element.fontFamily}" onchange="updateElementProperty('fontFamily', this.value)">
            <option value="Noto Sans JP" \${element.fontFamily === 'Noto Sans JP' ? 'selected' : ''}>Noto Sans JP</option>
            <option value="Noto Serif JP" \${element.fontFamily === 'Noto Serif JP' ? 'selected' : ''}>Noto Serif JP</option>
          </select>
        </div>

        <div class="form-group">
          <label>フォントウェイト</label>
          <select value="\${element.fontWeight}" onchange="updateElementProperty('fontWeight', parseInt(this.value))">
            <option value="400" \${element.fontWeight === 400 ? 'selected' : ''}>400 (Regular)</option>
            <option value="700" \${element.fontWeight === 700 ? 'selected' : ''}>700 (Bold)</option>
          </select>
        </div>

        <div class="form-group">
          <label>テキスト配置</label>
          <select value="\${element.textAlign}" onchange="updateElementProperty('textAlign', this.value)">
            <option value="left" \${element.textAlign === 'left' ? 'selected' : ''}>左揃え</option>
            <option value="center" \${element.textAlign === 'center' ? 'selected' : ''}>中央揃え</option>
            <option value="right" \${element.textAlign === 'right' ? 'selected' : ''}>右揃え</option>
          </select>
        </div>

        <div class="form-group">
          <label>テキスト色</label>
          <input type="color" value="\${element.color}" onchange="updateElementProperty('color', this.value)">
        </div>

        <div class="form-group">
          <label>最大幅（折り返し）</label>
          <input type="number" value="\${element.maxWidth || ''}" min="50" placeholder="未設定" onchange="updateElementProperty('maxWidth', this.value ? parseInt(this.value) : undefined)">
        </div>

        <div class="form-group">
          <label>最大高さ（自動調整）</label>
          <input type="number" value="\${element.maxHeight || ''}" min="20" placeholder="未設定" onchange="updateElementProperty('maxHeight', this.value ? parseInt(this.value) : undefined)">
        </div>

        <div class="form-group">
          <button class="danger" onclick="deleteSelectedElement()" style="width: 100%; padding: 10px;">この要素を削除</button>
        </div>
      \`;
    }

    function updateTemplateProperty(key, value) {
      templateState[key] = value;
      if (key === 'background') renderCanvas();
    }

    function updateBackgroundType(type) {
      let defaultValue = '';
      if (type === 'color') defaultValue = '#1e40ff';
      else if (type === 'upload') defaultValue = templateState.background.value || '';

      templateState.background = { type, value: defaultValue };
      showTemplateProperties();
      renderCanvas();
    }

    function updateCanvasSize() {
      templateState.width = parseInt(document.getElementById('templateWidth').value);
      templateState.height = parseInt(document.getElementById('templateHeight').value);
      renderCanvas();
    }

    async function handleBackgroundUpload(event) {
      const file = event.target ? event.target.files[0] : event.dataTransfer?.files[0];
      if (!file) return;

      // ファイルタイプとサイズのバリデーション
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        alert('対応していない画像形式です。PNG, JPEG, GIF, WebP, SVGのみアップロード可能です。');
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。');
        return;
      }

      // アップロード中の表示
      const uploadArea = document.getElementById('uploadArea');
      if (uploadArea) {
        uploadArea.classList.add('uploading');
        uploadArea.innerHTML = '<div class="text">アップロード中...</div>';
      }

      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/images/upload', {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('アップロードに失敗しました');
        }

        const result = await response.json();

        // 背景画像のURLを更新
        templateState.background = { type: 'upload', value: result.url };
        showTemplateProperties();
        renderCanvas();
      } catch (error) {
        console.error('Upload error:', error);
        alert('画像のアップロードに失敗しました。もう一度お試しください。');
        showTemplateProperties();
      }
    }

    function setupUploadAreaHandlers() {
      const uploadArea = document.getElementById('uploadArea');
      if (!uploadArea) return;

      // ドラッグオーバーイベント
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
      });

      // ドラッグリーブイベント
      uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
      });

      // ドロップイベント
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        handleBackgroundUpload(e);
      });
    }

    function updateElementProperty(key, value) {
      const element = templateState.elements.find(el => el.id === selectedElementId);
      if (!element) return;

      element[key] = value;
      renderCanvas();
    }

    async function saveTemplate() {
      try {
        if (!templateState.name) {
          alert('テンプレート名を入力してください');
          showTemplateProperties();
          document.getElementById('templateName').focus();
          return;
        }

        if (templateState.elements.length === 0) {
          if (!confirm('テキスト要素がありません。このまま保存しますか？')) return;
        }

        const method = templateState.id ? 'PUT' : 'POST';
        const url = templateState.id ? \`/templates/\${templateState.id}\` : '/templates';

        const { id, createdAt, updatedAt, ...payload } = templateState;

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('保存に失敗しました');

        const savedTemplate = await response.json();
        alert('保存しました！');

        // Redirect to template list
        window.location.href = '/templates/ui';
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }

    async function previewTemplate() {
      try {
        // Create test data
        const testData = {};
        templateState.elements.forEach(el => {
          testData[el.variable] = \`サンプル\${el.variable}\`;
        });

        // Generate preview
        const response = await fetch('/render', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify({
            template: templateState,
            format: 'png',
            data: testData
          })
        });

        if (!response.ok) throw new Error('プレビュー生成に失敗しました');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Open in new window
        const win = window.open('', '_blank');
        win.document.write(\`<img src="\${url}" style="max-width: 100%; height: auto;">\`);
      } catch (error) {
        alert('エラー: ' + error.message);
      }
    }
  </script>
</body>
</html>
  `;
  return c.html(html);
})

// GET /templates/editor/:id - Visual template editor (edit existing template)
app.get('/templates/editor/:id', (c) => {
  // Redirect to editor with id query param
  const id = c.req.param('id');
  return c.redirect(`/templates/editor?id=${id}`);
})

// GET /templates - List all templates
app.get('/templates', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  try {
    // Only list keys with 'template:' prefix
    const keys = await c.env.TEMPLATES.list({ prefix: 'template:' })
    const templates: Template[] = []

    for (const key of keys.keys) {
      try {
        const template = await c.env.TEMPLATES.get(key.name, 'json')
        if (template) templates.push(template as Template)
      } catch (error) {
        console.error(`Failed to parse template ${key.name}:`, error)
        // Continue with other templates
      }
    }

    return c.json(templates)
  } catch (error) {
    console.error('Failed to list templates:', error)
    return c.json({ error: 'Failed to list templates' }, 500)
  }
})

// GET /templates/:id - Get a specific template
app.get('/templates/:id', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const id = c.req.param('id')
  const template = await c.env.TEMPLATES.get(`template:${id}`, 'json')

  if (!template) return c.json({ error: 'Template not found' }, 404)

  return c.json(template)
})

// POST /templates - Create a new template
app.post('/templates', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const body = await c.req.json() as Omit<Template, 'id' | 'createdAt' | 'updatedAt'>
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const template: Template = {
    ...body,
    id,
    createdAt: now,
    updatedAt: now
  }

  await c.env.TEMPLATES.put(`template:${id}`, JSON.stringify(template))

  return c.json(template, 201)
})

// PUT /templates/:id - Update a template
app.put('/templates/:id', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const id = c.req.param('id')
  const existing = await c.env.TEMPLATES.get(`template:${id}`, 'json') as Template

  if (!existing) return c.json({ error: 'Template not found' }, 404)

  const body = await c.req.json() as Partial<Template>
  const updated: Template = {
    ...existing,
    ...body,
    id: existing.id,  // Prevent ID change
    createdAt: existing.createdAt,  // Preserve creation time
    updatedAt: new Date().toISOString()
  }

  await c.env.TEMPLATES.put(`template:${id}`, JSON.stringify(updated))

  return c.json(updated)
})

// POST /templates/thumbnail - Generate thumbnail for a template
app.post('/templates/thumbnail', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const body = await c.req.json() as { template: Template }
  const template = body.template

  if (!template || !template.id) {
    return c.json({ error: 'Template with ID is required' }, 400)
  }

  try {
    // Generate sample data
    const sampleData: Record<string, string> = {}
    template.elements.forEach((el) => {
      sampleData[el.variable] = `サンプル${el.variable}`
    })

    // Render to SVG
    const svg = await renderTemplateToSvg(template, sampleData, c.env)

    // Convert to PNG
    await ensureWasmInitialized()
    const resvg = new Resvg(svg)
    const png = resvg.render().asPng()

    // Save to R2
    const thumbnailKey = `template-thumbnails/${template.id}.png`
    await c.env.IMAGES.put(thumbnailKey, png, {
      httpMetadata: {
        contentType: 'image/png',
      },
    })

    // Generate URL
    const url = new URL(c.req.url)
    const thumbnailUrl = `${url.protocol}//${url.host}/images/${thumbnailKey}`

    return c.json({ thumbnailUrl })
  } catch (error) {
    console.error('Thumbnail generation error:', error)
    return c.json({ error: 'Failed to generate thumbnail' }, 500)
  }
})

// DELETE /templates/:id - Delete a template
app.delete('/templates/:id', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const id = c.req.param('id')
  await c.env.TEMPLATES.delete(`template:${id}`)

  return c.json({ success: true })
})

export default app
