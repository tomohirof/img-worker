/**
 * renderer.tsx のユニットテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Template, RenderInput, Bindings } from '../types'

// モジュールのモック
vi.mock('satori', () => ({
  default: vi.fn().mockResolvedValue('<svg>mocked svg</svg>')
}))

vi.mock('./font', () => ({
  ensureFontsLoaded: vi.fn().mockResolvedValue(undefined),
  getFonts: vi.fn().mockReturnValue([
    { name: 'Noto Sans JP', data: new ArrayBuffer(100), weight: 400, style: 'normal' },
    { name: 'Noto Serif JP', data: new ArrayBuffer(100), weight: 700, style: 'normal' },
  ])
}))

vi.mock('./image', () => ({
  toDataUrl: vi.fn()
}))

describe('renderer service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('renderTemplateToSvg', () => {
    it('基本的なテンプレート（color背景）を正しくレンダリングできる', async () => {
      // 動的インポートで関数を読み込む
      const { renderTemplateToSvg } = await import('./renderer.tsx')
      const satori = (await import('satori')).default
      const { ensureFontsLoaded, getFonts } = await import('./font')

      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        width: 1200,
        height: 630,
        background: {
          type: 'color',
          value: '#ffffff'
        },
        elements: [
          {
            id: 'title',
            type: 'text',
            variable: 'title',
            x: 100,
            y: 100,
            fontSize: 48,
            fontFamily: 'Noto Sans JP',
            fontWeight: 700,
            color: '#000000'
          }
        ]
      }

      const data = { title: 'テストタイトル' }

      const result = await renderTemplateToSvg(template, data)

      // フォントが読み込まれたことを確認
      expect(ensureFontsLoaded).toHaveBeenCalledOnce()

      // Satoriが正しいパラメータで呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
      const satoriCallArgs = vi.mocked(satori).mock.calls[0]
      expect(satoriCallArgs[1]).toEqual({
        width: 1200,
        height: 630,
        fonts: getFonts()
      })

      // SVG文字列が返されることを確認
      expect(result).toBe('<svg>mocked svg</svg>')
    })

    it('画像背景を指定した場合、toDataUrlが呼ばれる', async () => {
      const { renderTemplateToSvg } = await import('./renderer.tsx')
      const { toDataUrl } = await import('./image')
      const satori = (await import('satori')).default

      // toDataUrlのモックの戻り値を設定
      vi.mocked(toDataUrl).mockResolvedValue('data:image/png;base64,mockdata')

      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        width: 1200,
        height: 630,
        background: {
          type: 'image',
          value: 'https://example.com/image.png'
        },
        elements: []
      }

      const data = {}
      const mockEnv = {} as Bindings

      await renderTemplateToSvg(template, data, mockEnv)

      // toDataUrlが呼ばれたことを確認
      expect(toDataUrl).toHaveBeenCalledWith('https://example.com/image.png', mockEnv)

      // Satoriが呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
    })

    it('upload背景を指定した場合、toDataUrlが呼ばれる', async () => {
      const { renderTemplateToSvg } = await import('./renderer.tsx')
      const { toDataUrl } = await import('./image')

      vi.mocked(toDataUrl).mockResolvedValue('data:image/png;base64,uploaddata')

      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        width: 1200,
        height: 630,
        background: {
          type: 'upload',
          value: '/images/uploads/test.png'
        },
        elements: []
      }

      const data = {}
      const mockEnv = {} as Bindings

      await renderTemplateToSvg(template, data, mockEnv)

      expect(toDataUrl).toHaveBeenCalledWith('/images/uploads/test.png', mockEnv)
    })

    it('背景画像の読み込みに失敗した場合、白色背景にフォールバックする', async () => {
      const { renderTemplateToSvg } = await import('./renderer.tsx')
      const { toDataUrl } = await import('./image')
      const satori = (await import('satori')).default

      // toDataUrlがエラーを投げる
      vi.mocked(toDataUrl).mockRejectedValue(new Error('Failed to load image'))

      // console.errorをモック
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        width: 1200,
        height: 630,
        background: {
          type: 'image',
          value: 'https://example.com/notfound.png'
        },
        elements: []
      }

      const data = {}

      await renderTemplateToSvg(template, data)

      // エラーがログ出力されたことを確認
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to convert background image to Data URL:',
        expect.any(Error)
      )

      // Satoriが呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()

      consoleErrorSpy.mockRestore()
    })

    it('背景画像URLが空の場合、白色背景にフォールバックする', async () => {
      const { renderTemplateToSvg } = await import('./renderer.tsx')
      const { toDataUrl } = await import('./image')
      const satori = (await import('satori')).default

      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        width: 1200,
        height: 630,
        background: {
          type: 'image',
          value: '' // 空文字列
        },
        elements: []
      }

      const data = {}

      await renderTemplateToSvg(template, data)

      // toDataUrlが呼ばれないことを確認
      expect(toDataUrl).not.toHaveBeenCalled()

      // Satoriが呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
    })

    it('複数のテンプレート要素を正しくレンダリングできる', async () => {
      const { renderTemplateToSvg } = await import('./renderer.tsx')
      const satori = (await import('satori')).default

      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        width: 1200,
        height: 630,
        background: {
          type: 'color',
          value: '#f0f0f0'
        },
        elements: [
          {
            id: 'title',
            type: 'text',
            variable: 'title',
            x: 100,
            y: 100,
            fontSize: 48,
            fontFamily: 'Noto Sans JP',
            fontWeight: 700,
            color: '#000000'
          },
          {
            id: 'subtitle',
            type: 'text',
            variable: 'subtitle',
            x: 100,
            y: 200,
            fontSize: 24,
            fontFamily: 'Noto Sans JP',
            fontWeight: 400,
            color: '#666666'
          }
        ]
      }

      const data = {
        title: 'メインタイトル',
        subtitle: 'サブタイトル'
      }

      await renderTemplateToSvg(template, data)

      // Satoriが呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
    })

    it('maxWidthが指定されている要素は幅が設定される', async () => {
      const { renderTemplateToSvg } = await import('./renderer.tsx')
      const satori = (await import('satori')).default

      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        width: 1200,
        height: 630,
        background: {
          type: 'color',
          value: '#ffffff'
        },
        elements: [
          {
            id: 'title',
            type: 'text',
            variable: 'title',
            x: 100,
            y: 100,
            fontSize: 48,
            fontFamily: 'Noto Sans JP',
            fontWeight: 700,
            color: '#000000',
            maxWidth: 800 // maxWidthを指定
          }
        ]
      }

      const data = { title: '長いテキストが折り返される' }

      await renderTemplateToSvg(template, data)

      expect(satori).toHaveBeenCalledOnce()
    })

    it('maxHeightを超える場合、フォントサイズが調整される', async () => {
      const { renderTemplateToSvg } = await import('./renderer.tsx')
      const satori = (await import('satori')).default

      const template: Template = {
        id: 'test-template',
        name: 'Test Template',
        width: 1200,
        height: 630,
        background: {
          type: 'color',
          value: '#ffffff'
        },
        elements: [
          {
            id: 'title',
            type: 'text',
            variable: 'title',
            x: 100,
            y: 100,
            fontSize: 48,
            fontFamily: 'Noto Sans JP',
            fontWeight: 700,
            color: '#000000',
            maxWidth: 400,
            maxHeight: 100,
            minFontSize: 20
          }
        ]
      }

      // 非常に長いテキスト
      const data = { title: 'これは非常に長いテキストで、複数行にわたって表示される必要があります。フォントサイズが自動調整されることを期待します。' }

      await renderTemplateToSvg(template, data)

      expect(satori).toHaveBeenCalledOnce()
    })
  })

  describe('templateMagazineBasic', () => {
    it('基本的なレンダリングができる（カバー画像なし）', async () => {
      const { templateMagazineBasic } = await import('./renderer.tsx')
      const satori = (await import('satori')).default
      const { ensureFontsLoaded, getFonts } = await import('./font')

      const input: Required<RenderInput> = {
        template: 'magazine-basic',
        format: 'svg',
        width: 1200,
        height: 630,
        data: {
          title: 'テストタイトル'
        }
      }

      const result = await templateMagazineBasic(input)

      // フォントが読み込まれたことを確認
      expect(ensureFontsLoaded).toHaveBeenCalledOnce()

      // Satoriが正しいパラメータで呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
      const satoriCallArgs = vi.mocked(satori).mock.calls[0]
      expect(satoriCallArgs[1]).toEqual({
        width: 1200,
        height: 630,
        fonts: getFonts()
      })

      // SVG文字列が返されることを確認
      expect(result).toBe('<svg>mocked svg</svg>')
    })

    it('デフォルト値が正しく適用される', async () => {
      const { templateMagazineBasic } = await import('./renderer.tsx')
      const satori = (await import('satori')).default

      const input: Required<RenderInput> = {
        template: 'magazine-basic',
        format: 'svg',
        width: 1200,
        height: 630,
        data: {
          title: 'タイトルのみ'
          // subtitle, brand, textColor, bgColorは指定しない
        }
      }

      await templateMagazineBasic(input)

      // Satoriが呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
    })

    it('カバー画像が指定されている場合、toDataUrlが呼ばれる', async () => {
      const { templateMagazineBasic } = await import('./renderer.tsx')
      const { toDataUrl } = await import('./image')
      const satori = (await import('satori')).default

      // toDataUrlのモックの戻り値を設定
      vi.mocked(toDataUrl).mockResolvedValue('data:image/png;base64,coverdata')

      const input: Required<RenderInput> = {
        template: 'magazine-basic',
        format: 'svg',
        width: 1200,
        height: 630,
        data: {
          title: 'カバー画像付き',
          cover: {
            image_url: 'https://example.com/cover.jpg'
          }
        }
      }

      const mockEnv = {} as Bindings

      await templateMagazineBasic(input, mockEnv)

      // toDataUrlが呼ばれたことを確認
      expect(toDataUrl).toHaveBeenCalledWith('https://example.com/cover.jpg', mockEnv)

      // Satoriが呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
    })

    it('カバー画像の読み込みに失敗しても処理は継続する', async () => {
      const { templateMagazineBasic } = await import('./renderer.tsx')
      const { toDataUrl } = await import('./image')
      const satori = (await import('satori')).default

      // toDataUrlがエラーを投げる
      vi.mocked(toDataUrl).mockRejectedValue(new Error('Failed to load cover'))

      const input: Required<RenderInput> = {
        template: 'magazine-basic',
        format: 'svg',
        width: 1200,
        height: 630,
        data: {
          title: 'カバー画像読み込み失敗',
          cover: {
            image_url: 'https://example.com/notfound.jpg'
          }
        }
      }

      // エラーがスローされないことを確認
      await expect(templateMagazineBasic(input)).resolves.not.toThrow()

      // Satoriが呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
    })

    it('すべてのオプションを指定できる', async () => {
      const { templateMagazineBasic } = await import('./renderer.tsx')
      const satori = (await import('satori')).default

      const input: Required<RenderInput> = {
        template: 'magazine-basic',
        format: 'svg',
        width: 1200,
        height: 630,
        data: {
          title: 'フルオプション',
          subtitle: 'サブタイトル',
          brand: 'CUSTOM BRAND',
          textColor: '#ff0000',
          bgColor: '#0000ff'
        }
      }

      await templateMagazineBasic(input)

      // Satoriが呼ばれたことを確認
      expect(satori).toHaveBeenCalledOnce()
    })
  })
})
