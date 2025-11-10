/* Cloudflare Workers + Hono + Satori + resvg-wasm */
import React from 'react'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authApp from './auth/routes'
import apiKeysApp from './api-keys/routes'
import renderApp from './routes/render'
import imagesApp from './routes/images'
import templatesApp from './routes/templates'
import type { Bindings } from './types'

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

// ヘルスチェック
app.get('/', (c) => c.text('ok'))

// 認証ルート
app.route('/auth', authApp)
app.route('/api-keys', apiKeysApp)

// レンダリング、画像、テンプレートルート
app.route('/', renderApp)
app.route('/images', imagesApp)
app.route('/templates', templatesApp)

export default app
