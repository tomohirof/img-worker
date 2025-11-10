/**
 * 画像管理API
 * R2バケットへの画像アップロード、取得、削除
 */

import { Hono } from 'hono'
import type { Bindings } from '../types'

const imagesApp = new Hono<{ Bindings: Bindings }>()

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
 * POST /images/upload - Upload image to R2
 */
imagesApp.post('/upload', async (c) => {
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

/**
 * GET /images/:key - Get image from R2
 */
imagesApp.get('/*', async (c) => {
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

/**
 * DELETE /images/:key - Delete image from R2
 */
imagesApp.delete('/*', async (c) => {
  const unauthorized = await requireApiKey(c)
  if (unauthorized) return unauthorized

  const key = c.req.path.replace('/images/', '')

  await c.env.IMAGES.delete(key)

  return c.json({ success: true })
})

export default imagesApp
