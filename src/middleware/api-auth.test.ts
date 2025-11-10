/**
 * API認証ミドルウェアのテスト
 * middleware/api-auth.ts の requireApiKey と requireApiKeyAuth 関数をテストします
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireApiKey, requireApiKeyAuth, getApiUserId } from './api-auth'
import type { Context } from 'hono'
import type { Bindings } from '../types'

// モックヘルパー: Honoコンテキストのモックを作成
function createMockContext(options: {
  header?: Record<string, string>
  query?: Record<string, string>
  env?: Partial<Bindings>
}): Context<{ Bindings: Bindings }> {
  const contextStore = new Map<string, any>()

  return {
    req: {
      header: (name: string) => options.header?.[name] || null,
      query: (name: string) => options.query?.[name] || undefined,
    },
    env: options.env as Bindings,
    set: (key: string, value: any) => {
      contextStore.set(key, value)
    },
    get: (key: string) => contextStore.get(key),
    text: (body: string, status?: number) => ({
      body,
      status: status || 200,
      type: 'text',
    }),
    json: (data: any, status?: number) => ({
      data,
      status: status || 200,
      type: 'json',
    }),
  } as any
}

// モックヘルパー: validateApiKey関数のモック
vi.mock('../api-keys/api-key', () => ({
  validateApiKey: vi.fn(),
  recordLastUsed: vi.fn().mockResolvedValue(undefined),
}))

import { validateApiKey, recordLastUsed } from '../api-keys/api-key'

describe('requireApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('APIキーなしの場合', () => {
    it('ヘッダーもクエリパラメータもない場合は401を返す', async () => {
      // Arrange
      const mockContext = createMockContext({
        header: {},
        query: {},
        env: {},
      })

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeTruthy()
      expect((result as any).body).toBe('Unauthorized: API key required')
      expect((result as any).status).toBe(401)
    })
  })

  describe('ユーザーAPIキーによる認証', () => {
    it('有効なユーザーAPIキー（ヘッダー）で認証成功する', async () => {
      // Arrange
      const mockApiKeyData = {
        keyId: 'key-123',
        userId: 'user-456',
        createdAt: Date.now(),
      }

      vi.mocked(validateApiKey).mockResolvedValue(mockApiKeyData)

      const mockContext = createMockContext({
        header: { 'x-api-key': 'valid-user-key' },
        env: { TEMPLATES: {} as any },
      })

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeNull() // 認証成功
      expect(validateApiKey).toHaveBeenCalledWith({}, 'valid-user-key')
      expect(mockContext.get('apiUserId')).toBe('user-456')
      expect(recordLastUsed).toHaveBeenCalledWith({}, 'key-123')
    })

    it('有効なユーザーAPIキー（クエリパラメータ）で認証成功する', async () => {
      // Arrange
      const mockApiKeyData = {
        keyId: 'key-789',
        userId: 'user-012',
        createdAt: Date.now(),
      }

      vi.mocked(validateApiKey).mockResolvedValue(mockApiKeyData)

      const mockContext = createMockContext({
        query: { api_key: 'valid-query-key' },
        env: { TEMPLATES: {} as any },
      })

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeNull()
      expect(validateApiKey).toHaveBeenCalledWith({}, 'valid-query-key')
      expect(mockContext.get('apiUserId')).toBe('user-012')
    })

    it('ヘッダーとクエリパラメータ両方ある場合はヘッダーを優先する', async () => {
      // Arrange
      const mockApiKeyData = {
        keyId: 'key-header',
        userId: 'user-header',
        createdAt: Date.now(),
      }

      vi.mocked(validateApiKey).mockResolvedValue(mockApiKeyData)

      const mockContext = createMockContext({
        header: { 'x-api-key': 'header-key' },
        query: { api_key: 'query-key' },
        env: { TEMPLATES: {} as any },
      })

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeNull()
      expect(validateApiKey).toHaveBeenCalledWith({}, 'header-key') // ヘッダーが優先
    })

    it('無効なユーザーAPIキーの場合は環境変数APIキーにフォールバックする', async () => {
      // Arrange
      vi.mocked(validateApiKey).mockResolvedValue(null) // ユーザーAPIキーは無効

      const mockContext = createMockContext({
        header: { 'x-api-key': 'env-api-key' },
        env: {
          TEMPLATES: {} as any,
          API_KEY: 'env-api-key', // 環境変数APIキー
        },
      })

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeNull() // 環境変数APIキーで認証成功
      expect(validateApiKey).toHaveBeenCalledWith({}, 'env-api-key')
    })
  })

  describe('環境変数APIキーによる認証（後方互換性）', () => {
    it('環境変数API_KEYと一致する場合は認証成功する', async () => {
      // Arrange
      vi.mocked(validateApiKey).mockResolvedValue(null) // ユーザーAPIキーなし

      const mockContext = createMockContext({
        header: { 'x-api-key': 'legacy-api-key' },
        env: {
          TEMPLATES: {} as any,
          API_KEY: 'legacy-api-key',
        },
      })

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeNull()
    })

    it('環境変数API_KEYと一致しない場合は401を返す', async () => {
      // Arrange
      vi.mocked(validateApiKey).mockResolvedValue(null)

      const mockContext = createMockContext({
        header: { 'x-api-key': 'wrong-key' },
        env: {
          TEMPLATES: {} as any,
          API_KEY: 'correct-key',
        },
      })

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeTruthy()
      expect((result as any).body).toBe('Unauthorized: Invalid API key')
      expect((result as any).status).toBe(401)
    })

    it('環境変数API_KEYが未設定の場合は401を返す', async () => {
      // Arrange
      vi.mocked(validateApiKey).mockResolvedValue(null)

      const mockContext = createMockContext({
        header: { 'x-api-key': 'some-key' },
        env: { TEMPLATES: {} as any },
      })

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeTruthy()
      expect((result as any).status).toBe(401)
    })
  })

  describe('エラーハンドリング', () => {
    it('validateApiKeyがエラーを投げても環境変数APIキーで認証できる', async () => {
      // Arrange
      vi.mocked(validateApiKey).mockRejectedValue(new Error('KV error'))

      const mockContext = createMockContext({
        header: { 'x-api-key': 'env-key' },
        env: {
          TEMPLATES: {} as any,
          API_KEY: 'env-key',
        },
      })

      // スパイを設定してconsole.errorをモック
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeNull() // 環境変数APIキーで認証成功
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'API key validation error:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('recordLastUsedがエラーを投げても認証は成功する', async () => {
      // Arrange
      const mockApiKeyData = {
        keyId: 'key-123',
        userId: 'user-456',
        createdAt: Date.now(),
      }

      vi.mocked(validateApiKey).mockResolvedValue(mockApiKeyData)
      vi.mocked(recordLastUsed).mockRejectedValue(new Error('Record error'))

      const mockContext = createMockContext({
        header: { 'x-api-key': 'valid-key' },
        env: { TEMPLATES: {} as any },
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const result = await requireApiKey(mockContext)

      // Assert
      expect(result).toBeNull() // エラーがあっても認証成功
      expect(mockContext.get('apiUserId')).toBe('user-456')

      consoleErrorSpy.mockRestore()
    })
  })
})

describe('requireApiKeyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('APIキーがない場合は401 JSONを返す', async () => {
    // Arrange
    const mockContext = createMockContext({
      header: {},
      env: { TEMPLATES: {} as any },
    })

    const mockNext = vi.fn()

    // Act
    const result = await requireApiKeyAuth(mockContext, mockNext)

    // Assert
    expect(result).toBeTruthy()
    expect((result as any).data).toEqual({
      error: 'UNAUTHORIZED',
      message: 'APIキーが必要です',
    })
    expect((result as any).status).toBe(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('無効なAPIキーの場合は401 JSONを返す', async () => {
    // Arrange
    vi.mocked(validateApiKey).mockResolvedValue(null)

    const mockContext = createMockContext({
      header: { 'x-api-key': 'invalid-key' },
      env: { TEMPLATES: {} as any },
    })

    const mockNext = vi.fn()

    // Act
    const result = await requireApiKeyAuth(mockContext, mockNext)

    // Assert
    expect(result).toBeTruthy()
    expect((result as any).data).toEqual({
      error: 'UNAUTHORIZED',
      message: '無効なAPIキーです',
    })
    expect((result as any).status).toBe(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('有効なAPIキーの場合はnext()を呼び、userIdをセットする', async () => {
    // Arrange
    const mockApiKeyData = {
      keyId: 'key-123',
      userId: 'user-456',
      createdAt: Date.now(),
    }

    vi.mocked(validateApiKey).mockResolvedValue(mockApiKeyData)

    const mockContext = createMockContext({
      header: { 'x-api-key': 'valid-key' },
      env: { TEMPLATES: {} as any },
    })

    const mockNext = vi.fn()

    // Act
    await requireApiKeyAuth(mockContext, mockNext)

    // Assert
    expect(mockContext.get('apiUserId')).toBe('user-456')
    expect(mockNext).toHaveBeenCalled()
    expect(recordLastUsed).toHaveBeenCalledWith({}, 'key-123')
  })

  it('recordLastUsedがエラーを投げても処理は継続する', async () => {
    // Arrange
    const mockApiKeyData = {
      keyId: 'key-789',
      userId: 'user-012',
      createdAt: Date.now(),
    }

    vi.mocked(validateApiKey).mockResolvedValue(mockApiKeyData)
    vi.mocked(recordLastUsed).mockRejectedValue(new Error('Record error'))

    const mockContext = createMockContext({
      header: { 'x-api-key': 'valid-key' },
      env: { TEMPLATES: {} as any },
    })

    const mockNext = vi.fn()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Act
    await requireApiKeyAuth(mockContext, mockNext)

    // Assert
    expect(mockContext.get('apiUserId')).toBe('user-012')
    expect(mockNext).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})

describe('getApiUserId', () => {
  it('contextにapiUserIdがセットされている場合は取得できる', () => {
    // Arrange
    const mockContext = createMockContext({
      env: {},
    })

    mockContext.set('apiUserId', 'user-123')

    // Act
    const result = getApiUserId(mockContext)

    // Assert
    expect(result).toBe('user-123')
  })

  it('contextにapiUserIdがセットされていない場合はundefinedを返す', () => {
    // Arrange
    const mockContext = createMockContext({
      env: {},
    })

    // Act
    const result = getApiUserId(mockContext)

    // Assert
    expect(result).toBeUndefined()
  })
})
