/**
 * テンプレートレンダリングサービス
 * SatoriとReactを使ってテンプレートをSVGに変換します
 */

import React from 'react'
import satori from 'satori'
import type { Bindings, Template, RenderInput } from '../types'
import { ensureFontsLoaded, getFonts } from './font'
import { toDataUrl } from './image'

/**
 * テンプレートをSVGにレンダリング
 * テンプレート定義とデータを受け取り、Satoriを使ってSVGを生成します
 *
 * @param template テンプレート定義（width, height, background, elements）
 * @param data テンプレート変数に埋め込むデータ
 * @param env Cloudflare Workers の Bindings（画像取得に必要）
 * @returns SVG文字列
 */
export async function renderTemplateToSvg(template: Template, data: Record<string, string>, env?: Bindings): Promise<string> {
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
    fonts: getFonts(),
  })

  return svg
}

/**
 * レガシーテンプレート: magazine-basic
 * 以前のAPIとの互換性のために残されています
 *
 * @param input レンダリング入力（width, height, data）
 * @param env Cloudflare Workers の Bindings
 * @returns SVG文字列
 */
export async function templateMagazineBasic(input: Required<RenderInput>, env?: Bindings) {
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
    fonts: getFonts(),
  })
  return svg
}
