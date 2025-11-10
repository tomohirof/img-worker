/**
 * フォント管理サービスのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ensureFontsLoaded, getFonts, __resetFontsForTesting } from './font'

describe('font service', () => {
  let mockFetch: any
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    // 元のfetchを保存
    originalFetch = global.fetch

    // フォントキャッシュをリセット
    __resetFontsForTesting()

    // fetchをモック
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    // fetchを元に戻す
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('ensureFontsLoaded', () => {
    it('初回呼び出しでNoto Sans JPとNoto Serif JPを読み込む', async () => {
      // Google Fonts CSS APIのレスポンスをモック
      const mockCssSans = `@font-face {
  font-family: 'Noto Sans JP';
  src: url(https://fonts.gstatic.com/s/notosansjp/v1/test-sans.woff2) format('woff2');
}`
      const mockCssSerif = `@font-face {
  font-family: 'Noto Serif JP';
  src: url(https://fonts.gstatic.com/s/notoserifp/v1/test-serif.woff2) format('woff2');
}`

      // フォントファイルのモックデータ
      const mockFontSansData = new Uint8Array([1, 2, 3, 4]).buffer
      const mockFontSerifData = new Uint8Array([5, 6, 7, 8]).buffer

      // fetchのレスポンスをセットアップ
      mockFetch
        // 1回目: Noto Sans JP CSS
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockCssSans
        })
        // 2回目: Noto Sans JP フォントファイル
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => mockFontSansData
        })
        // 3回目: Noto Serif JP CSS
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockCssSerif
        })
        // 4回目: Noto Serif JP フォントファイル
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => mockFontSerifData
        })

      await ensureFontsLoaded()

      // fetchが4回呼ばれたことを確認（CSS x2 + フォントファイル x2）
      expect(mockFetch).toHaveBeenCalledTimes(4)

      // Noto Sans JP CSS リクエストを確認
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&display=swap',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          })
        })
      )

      // Noto Serif JP CSS リクエストを確認
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@700&display=swap',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          })
        })
      )
    })

    it('2回目以降の呼び出しではキャッシュを使う（再度fetchしない）', async () => {
      // フェッチのセットアップ（1回目用）
      const mockCssSans = 'src: url(https://test.com/sans.woff2)'
      const mockCssSerif = 'src: url(https://test.com/serif.woff2)'
      const mockFontData = new Uint8Array([1, 2, 3]).buffer

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: async () => mockCssSans })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => mockFontData })
        .mockResolvedValueOnce({ ok: true, text: async () => mockCssSerif })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => mockFontData })

      // 1回目の呼び出し
      await ensureFontsLoaded()

      // fetchが4回呼ばれたことを確認
      expect(mockFetch).toHaveBeenCalledTimes(4)

      // モックをクリア
      mockFetch.mockClear()

      // 2回目の呼び出し
      await ensureFontsLoaded()

      // 2回目はfetchが呼ばれないことを確認（キャッシュ使用）
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('フォントCSS取得に失敗した場合、エラーをスローする', async () => {
      // CSS取得を失敗させる
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      // エラーがスローされることを確認
      await expect(ensureFontsLoaded()).rejects.toThrow('フォントの読み込みに失敗しました')
    })

    it('フォントファイル取得に失敗した場合、エラーをスローする', async () => {
      const mockCss = 'src: url(https://test.com/font.woff2)'

      mockFetch
        // CSS取得は成功
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockCss
        })
        // フォントファイル取得は失敗
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })

      // エラーがスローされることを確認
      await expect(ensureFontsLoaded()).rejects.toThrow('フォントの読み込みに失敗しました')
    })

    it('CSSにフォントURLが含まれていない場合、エラーをスローする', async () => {
      const mockCss = 'invalid css without url()'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockCss
      })

      // エラーがスローされることを確認
      await expect(ensureFontsLoaded()).rejects.toThrow('フォントの読み込みに失敗しました')
    })
  })

  describe('getFonts', () => {
    it('フォントが読み込まれていない場合、エラーをスローする', () => {
      // エラーがスローされることを確認
      expect(() => getFonts()).toThrow('Fonts are not loaded yet')
    })

    it('フォントが読み込まれている場合、正しいフォント設定を返す', async () => {
      // フォント読み込みのセットアップ
      const mockCssSans = 'src: url(https://test.com/sans.woff2)'
      const mockCssSerif = 'src: url(https://test.com/serif.woff2)'
      const mockFontSansData = new Uint8Array([1, 2, 3]).buffer
      const mockFontSerifData = new Uint8Array([4, 5, 6]).buffer

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: async () => mockCssSans })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => mockFontSansData })
        .mockResolvedValueOnce({ ok: true, text: async () => mockCssSerif })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => mockFontSerifData })

      // フォントを読み込む
      await ensureFontsLoaded()

      // getFontsを呼び出し
      const fonts = getFonts()

      // フォント設定が正しいことを確認
      expect(fonts).toHaveLength(2)

      // Noto Sans JP
      expect(fonts[0]).toEqual({
        name: 'Noto Sans JP',
        data: mockFontSansData,
        weight: 400,
        style: 'normal'
      })

      // Noto Serif JP
      expect(fonts[1]).toEqual({
        name: 'Noto Serif JP',
        data: mockFontSerifData,
        weight: 700,
        style: 'normal'
      })
    })

    it('getFontsは同じフォントデータを返す（参照の一貫性）', async () => {
      // フォント読み込みのセットアップ
      const mockCss = 'src: url(https://test.com/font.woff2)'
      const mockFontData = new Uint8Array([1, 2, 3]).buffer

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: async () => mockCss })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => mockFontData })
        .mockResolvedValueOnce({ ok: true, text: async () => mockCss })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => mockFontData })

      await ensureFontsLoaded()

      // 複数回呼び出し
      const fonts1 = getFonts()
      const fonts2 = getFonts()

      // 同じデータ参照を返すことを確認
      expect(fonts1[0].data).toBe(fonts2[0].data)
      expect(fonts1[1].data).toBe(fonts2[1].data)
    })
  })
})
