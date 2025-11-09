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
import type { Bindings, TextElement, Template, RenderInput } from './types'
import { arrayBufferToDataUrl } from './utils/encoding'

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
  try {
    // Google Fonts CSS APIを使ってフォントURLを取得
    const familyParam = family.replace(/ /g, '+')
    const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}&display=swap`

    const cssResponse = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!cssResponse.ok) {
      throw new Error(`Failed to fetch font CSS for ${family}: ${cssResponse.status} ${cssResponse.statusText}`)
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
      throw new Error(`Failed to fetch font file for ${family}: ${fontResponse.status} ${fontResponse.statusText}`)
    }

    return await fontResponse.arrayBuffer()
  } catch (error) {
    console.error(`Error loading font ${family} (weight: ${weight}):`, error)
    throw error
  }
}

// フォントを初期化（一度だけ読み込み）
async function ensureFontsLoaded() {
  try {
    if (!fontSansData) {
      fontSansData = await loadFont('Noto Sans JP', 400)
    }
    if (!fontSerifData) {
      fontSerifData = await loadFont('Noto Serif JP', 700)
    }
  } catch (error) {
    console.error('Failed to load fonts:', error)
    throw new Error('フォントの読み込みに失敗しました')
  }
}

const app = new Hono<{ Bindings: Bindings }>()

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
      const ct = object.httpMetadata?.contentType || 'image/png';
      return arrayBufferToDataUrl(buf, ct);
    } catch (error) {
      console.error('Failed to fetch image from R2:', error);
      throw error;
    }
  }

  // For external URLs, use fetch as before
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to fetch image');
  const buf = await res.arrayBuffer();
  const ct = res.headers.get('content-type') || 'image/png';
  return arrayBufferToDataUrl(buf, ct);
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
        backgroundColor: effectiveBackgroundType === 'color' ? backgroundValue : 'transparent',
        display: 'flex',
        position: 'relative',
      }}
    >
      {/* Background image using <img> tag for better Satori support */}
      {effectiveBackgroundType !== 'color' && backgroundValue && (
        <img
          src={backgroundValue}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      )}
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
  const { getFormHtml } = require('./html-templates/form')
  return c.html(getFormHtml());
})

app.post('/render', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  try {
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
  } catch (error) {
    console.error('Error in /render endpoint:', error)

    // JSONパースエラーの場合
    if (error instanceof SyntaxError) {
      return c.json({
        error: 'BAD_REQUEST',
        message: 'リクエストボディのJSONが不正です'
      }, 400)
    }

    // その他のエラー
    return c.json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : '画像生成中にエラーが発生しました'
    }, 500)
  }
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
  const { getTemplatesUiHtml } = require('./html-templates/templates-ui')
  return c.html(getTemplatesUiHtml());
})

// GET /templates/editor - Visual template editor (new template)
app.get('/templates/editor', (c) => {
  const { getTemplatesEditorHtml } = require('./html-templates/templates-editor')
  return c.html(getTemplatesEditorHtml());
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

    // Sort templates by createdAt in descending order (newest first)
    templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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
