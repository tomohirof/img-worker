/**
 * 画像レンダリングAPI
 * テンプレートから画像を生成するエンドポイント
 */

import { Hono } from 'hono'
import { Resvg } from '@resvg/resvg-wasm'
import type { Bindings, Template, RenderInput } from '../types'
import { ensureWasmInitialized } from '../services/wasm'
import { renderTemplateToSvg, templateMagazineBasic } from '../services/renderer.tsx'

const renderApp = new Hono<{ Bindings: Bindings }>()

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
 * GET /render/form - テストフォーム（ブラウザでAPIをテスト）
 */
renderApp.get('/form', (c) => {
  const { getFormHtml } = require('../html-templates/form')
  return c.html(getFormHtml());
})

/**
 * POST /render - 画像生成（API Key認証必須）
 */
renderApp.post('/render', async (c) => {
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

export default renderApp
