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
