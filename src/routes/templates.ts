/**
 * テンプレート管理API
 * テンプレートのCRUD操作とサムネイル生成
 */

import { Hono } from 'hono'
import { Resvg } from '@resvg/resvg-wasm'
import type { Bindings, Template } from '../types'
import { ensureWasmInitialized } from '../services/wasm'
import { renderTemplateToSvg } from '../services/renderer.tsx'

const templatesApp = new Hono<{ Bindings: Bindings }>()

/**
 * APIキー認証（後方互換性のため環境変数もサポート）
 * Phase 3でmiddleware/auth.tsに移動予定
 */
async function requireApiKey(c: any) {
  const q = c.req.query('api_key')
  const h = c.req.header('x-api-key')
  const provided = h || q

  if (!provided) {
    return c.text('Unauthorized: API key required', 401)
  }

  // まずユーザー固有のAPIキーをチェック
  const { validateApiKey } = await import('../api-keys/api-key')
  try {
    const apiKeyData = await validateApiKey(c.env.TEMPLATES, provided)
    if (apiKeyData) {
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

/**
 * GET /templates/ui - Template management UI
 */
templatesApp.get('/ui', (c) => {
  const { getTemplatesUiHtml } = require('../html-templates/templates-ui')
  return c.html(getTemplatesUiHtml());
})

/**
 * GET /templates/editor - Visual template editor (new template)
 */
templatesApp.get('/editor', (c) => {
  const { getTemplatesEditorHtml } = require('../html-templates/templates-editor')
  return c.html(getTemplatesEditorHtml());
})

/**
 * GET /templates/editor/:id - Visual template editor (edit existing template)
 */
templatesApp.get('/editor/:id', (c) => {
  // Redirect to editor with id query param
  const id = c.req.param('id');
  return c.redirect(`/templates/editor?id=${id}`);
})

/**
 * GET /templates - List all templates
 */
templatesApp.get('/', async (c) => {
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

/**
 * GET /templates/:id - Get a specific template
 */
templatesApp.get('/:id', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const id = c.req.param('id')
  const template = await c.env.TEMPLATES.get(`template:${id}`, 'json')

  if (!template) return c.json({ error: 'Template not found' }, 404)

  return c.json(template)
})

/**
 * POST /templates - Create a new template
 */
templatesApp.post('/', async (c) => {
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

/**
 * PUT /templates/:id - Update a template
 */
templatesApp.put('/:id', async (c) => {
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

/**
 * POST /templates/thumbnail - Generate thumbnail for a template
 */
templatesApp.post('/thumbnail', async (c) => {
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

/**
 * DELETE /templates/:id - Delete a template
 */
templatesApp.delete('/:id', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const id = c.req.param('id')
  await c.env.TEMPLATES.delete(`template:${id}`)

  return c.json({ success: true })
})

export default templatesApp
