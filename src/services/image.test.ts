/**
 * 画像変換サービスのテスト
 * services/image.ts の toDataUrl 関数をテストします
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toDataUrl } from './image'
import type { Bindings } from '../types'

describe('toDataUrl', () => {
  // グローバルfetchのモック保存用
  const originalFetch = global.fetch

  beforeEach(() => {
    // 各テスト前にfetchをリセット
    global.fetch = originalFetch
  })

  afterEach(() => {
    // テスト後にモックをクリア
    vi.restoreAllMocks()
  })

  describe('外部URLの画像取得', () => {
    it('外部URLから正常に画像を取得してData URLに変換できる', async () => {
      // Arrange: fetchのモック設定
      const mockImageData = new Uint8Array([137, 80, 78, 71]) // PNG header
      const mockResponse = {
        ok: true,
        arrayBuffer: async () => mockImageData.buffer,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'image/png' : null),
        },
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Act: 外部URLで画像を取得
      const result = await toDataUrl('https://example.com/image.png')

      // Assert: Data URL形式であることを確認
      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.png')
    })

    it('外部URLの取得に失敗した場合はエラーを投げる', async () => {
      // Arrange: fetchが失敗するモック
      const mockResponse = {
        ok: false,
        status: 404,
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Act & Assert: エラーが投げられることを確認
      await expect(toDataUrl('https://example.com/notfound.png')).rejects.toThrow(
        'failed to fetch image'
      )
    })

    it('content-typeが指定されていない場合はimage/pngをデフォルトで使用', async () => {
      // Arrange: content-typeなしのレスポンス
      const mockImageData = new Uint8Array([1, 2, 3, 4])
      const mockResponse = {
        ok: true,
        arrayBuffer: async () => mockImageData.buffer,
        headers: {
          get: () => null, // content-typeなし
        },
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Act
      const result = await toDataUrl('https://example.com/image')

      // Assert: デフォルトでimage/pngが使用される
      expect(result).toMatch(/^data:image\/png;base64,/)
    })

    it('JPEGなど別のcontent-typeも正しく処理できる', async () => {
      // Arrange: JPEGレスポンス
      const mockImageData = new Uint8Array([255, 216, 255, 224]) // JPEG header
      const mockResponse = {
        ok: true,
        arrayBuffer: async () => mockImageData.buffer,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'image/jpeg' : null),
        },
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Act
      const result = await toDataUrl('https://example.com/image.jpg')

      // Assert: image/jpegが使用される
      expect(result).toMatch(/^data:image\/jpeg;base64,/)
    })
  })

  describe('R2ストレージからの画像取得', () => {
    it('R2バインディングを使用してローカル画像を取得できる', async () => {
      // Arrange: R2モック
      const mockImageData = new Uint8Array([137, 80, 78, 71])
      const mockR2Object = {
        arrayBuffer: async () => mockImageData.buffer,
        httpMetadata: { contentType: 'image/png' },
      }

      const mockEnv: Partial<Bindings> = {
        IMAGES: {
          get: vi.fn().mockResolvedValue(mockR2Object),
        } as any,
      }

      // Act: ローカル画像URLで取得
      const result = await toDataUrl(
        'http://localhost:8008/images/uploads/test.png',
        mockEnv as Bindings
      )

      // Assert
      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(mockEnv.IMAGES!.get).toHaveBeenCalledWith('uploads/test.png')
    })

    it('本番環境のURLでもR2から画像を取得できる', async () => {
      // Arrange
      const mockImageData = new Uint8Array([255, 216, 255, 224])
      const mockR2Object = {
        arrayBuffer: async () => mockImageData.buffer,
        httpMetadata: { contentType: 'image/jpeg' },
      }

      const mockEnv: Partial<Bindings> = {
        IMAGES: {
          get: vi.fn().mockResolvedValue(mockR2Object),
        } as any,
      }

      // Act
      const result = await toDataUrl(
        'https://ogp-worker.tomohirof.workers.dev/images/uploads/photo.jpg',
        mockEnv as Bindings
      )

      // Assert
      expect(result).toMatch(/^data:image\/jpeg;base64,/)
      expect(mockEnv.IMAGES!.get).toHaveBeenCalledWith('uploads/photo.jpg')
    })

    it('R2にオブジェクトが存在しない場合はエラーを投げる', async () => {
      // Arrange: R2からnullを返す
      const mockEnv: Partial<Bindings> = {
        IMAGES: {
          get: vi.fn().mockResolvedValue(null),
        } as any,
      }

      // Act & Assert
      await expect(
        toDataUrl('http://localhost:8008/images/uploads/notfound.png', mockEnv as Bindings)
      ).rejects.toThrow('Image not found in R2: uploads/notfound.png')
    })

    it('R2オブジェクトにcontentTypeがない場合はimage/pngをデフォルトで使用', async () => {
      // Arrange: contentTypeなしのR2オブジェクト
      const mockImageData = new Uint8Array([1, 2, 3, 4])
      const mockR2Object = {
        arrayBuffer: async () => mockImageData.buffer,
        httpMetadata: {}, // contentTypeなし
      }

      const mockEnv: Partial<Bindings> = {
        IMAGES: {
          get: vi.fn().mockResolvedValue(mockR2Object),
        } as any,
      }

      // Act
      const result = await toDataUrl(
        'http://localhost:8008/images/uploads/unknown.bin',
        mockEnv as Bindings
      )

      // Assert: デフォルトでimage/pngが使用される
      expect(result).toMatch(/^data:image\/png;base64,/)
    })

    it('envが未定義の場合は外部URLとして処理される', async () => {
      // Arrange: fetchのモック（envなしの場合は外部URL扱い）
      const mockImageData = new Uint8Array([1, 2, 3])
      const mockResponse = {
        ok: true,
        arrayBuffer: async () => mockImageData.buffer,
        headers: {
          get: () => 'image/png',
        },
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Act: envなしで呼び出し
      const result = await toDataUrl('http://localhost:8008/images/uploads/test.png')

      // Assert: fetchが使用される
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8008/images/uploads/test.png')
      expect(result).toMatch(/^data:image\/png;base64,/)
    })

    it('env.IMAGESが未定義の場合も外部URLとして処理される', async () => {
      // Arrange
      const mockImageData = new Uint8Array([1, 2, 3])
      const mockResponse = {
        ok: true,
        arrayBuffer: async () => mockImageData.buffer,
        headers: {
          get: () => 'image/png',
        },
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const mockEnv: Partial<Bindings> = {} // IMAGESなし

      // Act
      const result = await toDataUrl(
        'http://localhost:8008/images/uploads/test.png',
        mockEnv as Bindings
      )

      // Assert
      expect(global.fetch).toHaveBeenCalled()
      expect(result).toMatch(/^data:image\/png;base64,/)
    })
  })

  describe('エッジケース', () => {
    it('空の画像データでも正常に処理できる', async () => {
      // Arrange
      const mockImageData = new Uint8Array([])
      const mockResponse = {
        ok: true,
        arrayBuffer: async () => mockImageData.buffer,
        headers: {
          get: () => 'image/png',
        },
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Act
      const result = await toDataUrl('https://example.com/empty.png')

      // Assert
      expect(result).toBe('data:image/png;base64,')
    })

    it('大きな画像データでも正常に処理できる', async () => {
      // Arrange: 1MBの画像データ
      const mockImageData = new Uint8Array(1024 * 1024)
      mockImageData.fill(255)

      const mockResponse = {
        ok: true,
        arrayBuffer: async () => mockImageData.buffer,
        headers: {
          get: () => 'image/png',
        },
      }

      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Act
      const result = await toDataUrl('https://example.com/large.png')

      // Assert
      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(result.length).toBeGreaterThan(1000000) // base64は約1.33倍のサイズ
    })

    it('URLに特殊文字が含まれていても正常に処理できる', async () => {
      // Arrange
      const mockImageData = new Uint8Array([1, 2, 3])
      const mockR2Object = {
        arrayBuffer: async () => mockImageData.buffer,
        httpMetadata: { contentType: 'image/png' },
      }

      const mockEnv: Partial<Bindings> = {
        IMAGES: {
          get: vi.fn().mockResolvedValue(mockR2Object),
        } as any,
      }

      // Act: URLエンコードされたパスでテスト
      const result = await toDataUrl(
        'http://localhost:8008/images/uploads/my%20image.png',
        mockEnv as Bindings
      )

      // Assert
      expect(mockEnv.IMAGES!.get).toHaveBeenCalledWith('uploads/my%20image.png')
      expect(result).toMatch(/^data:image\/png;base64,/)
    })
  })
})
