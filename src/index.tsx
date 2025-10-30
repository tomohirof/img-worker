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
  TEMPLATES: KVNamespace
}

// Template types
interface TextElement {
  id: string
  variable: string  // e.g., "title", "category"
  x: number
  y: number
  width?: number
  height?: number
  maxWidth?: number  // Maximum width for text wrapping
  fontSize: number
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
    type: 'color' | 'image'
    value: string  // color code or image URL
  }
  elements: TextElement[]
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
  template?: string  // 'magazine-basic' or template ID
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
async function renderTemplateToSvg(template: Template, data: Record<string, string>): Promise<string> {
  const { width, height, background, elements } = template

  // Create JSX elements from template definition
  const jsxElements = elements.map(el => {
    const value = data[el.variable] || ''

    // Build style object with text wrapping support
    const style: any = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      color: el.color,
      fontWeight: el.fontWeight,
      textAlign: 'left',  // Always use left alignment for simplicity
      display: 'flex',
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
        background: background.type === 'color' ? background.value : `url(${background.value})`,
        display: 'flex',
        position: 'relative',
      }}
    >
      {jsxElements}
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
  const unauthorized = requireApiKey(c)
  if (unauthorized) return unauthorized

  const body = (await c.req.json()) as RenderInput
  const format = body.format || 'png'

  let svg: string

  // Check if using custom template
  if (body.templateId) {
    // Load template from KV
    const template = await c.env.TEMPLATES.get(`template:${body.templateId}`, 'json') as Template
    if (!template) {
      return c.json({ error: 'Template not found' }, 404)
    }

    // Use template dimensions or override
    const width = body.width ?? template.width
    const height = body.height ?? template.height

    // Render using template
    svg = await renderTemplateToSvg(template, body.data as Record<string, string>)
  } else {
    // Use legacy magazine-basic template
    const width = Math.max(200, Math.min(4096, body.width ?? 1200))
    const height = Math.max(200, Math.min(4096, body.height ?? 630))
    const input: Required<RenderInput> = {
      template: body.template || 'magazine-basic',
      format, width, height,
      data: body.data as any
    }
    svg = await templateMagazineBasic(input)
  }

  if (format === 'svg') return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })

  await ensureWasmInitialized()
  const resvg = new Resvg(svg)
  const png = resvg.render().asPng()
  return new Response(png, { headers: { 'Content-Type': 'image/png' } })
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
    <button onclick="showCreateModal()">新規テンプレート作成</button>
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
        <textarea id="templateJson" placeholder='{\n  "width": 1200,\n  "height": 630,\n  "background": { "type": "color", "value": "#1e40ff" },\n  "elements": [\n    {\n      "id": "title",\n      "variable": "title",\n      "x": 100,\n      "y": 300,\n      "maxWidth": 1000,\n      "fontSize": 72,\n      "fontFamily": "Noto Serif JP",\n      "color": "#ffffff",\n      "fontWeight": 700,\n      "textAlign": "left"\n    },\n    {\n      "id": "category",\n      "variable": "category",\n      "x": 100,\n      "y": 200,\n      "maxWidth": 800,\n      "fontSize": 24,\n      "fontFamily": "Noto Sans JP",\n      "color": "#ffff00",\n      "fontWeight": 400,\n      "textAlign": "left"\n    }\n  ]\n}'></textarea>
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
            <button onclick="viewTemplate('\${template.id}')">詳細</button>
            <button onclick="editTemplate('\${template.id}')">編集</button>
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

// GET /templates - List all templates
app.get('/templates', async (c) => {
  const unauthorized = requireApiKey(c)
  if (unauthorized) return unauthorized

  const keys = await c.env.TEMPLATES.list()
  const templates: Template[] = []

  for (const key of keys.keys) {
    const template = await c.env.TEMPLATES.get(key.name, 'json')
    if (template) templates.push(template as Template)
  }

  return c.json(templates)
})

// GET /templates/:id - Get a specific template
app.get('/templates/:id', async (c) => {
  const unauthorized = requireApiKey(c)
  if (unauthorized) return unauthorized

  const id = c.req.param('id')
  const template = await c.env.TEMPLATES.get(`template:${id}`, 'json')

  if (!template) return c.json({ error: 'Template not found' }, 404)

  return c.json(template)
})

// POST /templates - Create a new template
app.post('/templates', async (c) => {
  const unauthorized = requireApiKey(c)
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
  const unauthorized = requireApiKey(c)
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

// DELETE /templates/:id - Delete a template
app.delete('/templates/:id', async (c) => {
  const unauthorized = requireApiKey(c)
  if (unauthorized) return unauthorized

  const id = c.req.param('id')
  await c.env.TEMPLATES.delete(`template:${id}`)

  return c.json({ success: true })
})

export default app
