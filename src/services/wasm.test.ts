/**
 * WASM初期化サービスのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureWasmInitialized } from './wasm'

// @resvg/resvg-wasmモジュールをモック
vi.mock('@resvg/resvg-wasm', () => ({
  initWasm: vi.fn().mockResolvedValue(undefined)
}))

// WASMモジュールをモック
vi.mock('../../node_modules/@resvg/resvg-wasm/index_bg.wasm', () => ({
  default: {} // モックのWASMモジュール
}))

describe('ensureWasmInitialized', () => {
  beforeEach(async () => {
    // 各テスト前にモジュールをリセット
    vi.resetModules()
    // モック関数の呼び出し履歴をクリア
    const { initWasm } = await import('@resvg/resvg-wasm')
    vi.mocked(initWasm).mockClear()
  })

  it('初回呼び出しでWASMを初期化する', async () => {
    const { initWasm } = await import('@resvg/resvg-wasm')

    // モジュールを再インポートして新しいインスタンスを取得
    const { ensureWasmInitialized: freshEnsureWasmInitialized } = await import('./wasm?t=' + Date.now())

    await freshEnsureWasmInitialized()

    // initWasmが1回呼ばれたことを確認
    expect(initWasm).toHaveBeenCalledTimes(1)
  })

  it('2回目以降の呼び出しではWASMを再初期化しない（キャッシュ動作）', async () => {
    const { initWasm } = await import('@resvg/resvg-wasm')

    // モジュールを再インポートして新しいインスタンスを取得
    const { ensureWasmInitialized: freshEnsureWasmInitialized } = await import('./wasm?t=' + Date.now())

    // 1回目の呼び出し
    await freshEnsureWasmInitialized()
    // 2回目の呼び出し
    await freshEnsureWasmInitialized()
    // 3回目の呼び出し
    await freshEnsureWasmInitialized()

    // initWasmは最初の1回だけ呼ばれることを確認
    expect(initWasm).toHaveBeenCalledTimes(1)
  })

  it('initWasmに正しいwasmModuleを渡す', async () => {
    const { initWasm } = await import('@resvg/resvg-wasm')

    // モジュールを再インポート
    const { ensureWasmInitialized: freshEnsureWasmInitialized } = await import('./wasm?t=' + Date.now())

    await freshEnsureWasmInitialized()

    // initWasmが何らかの引数で呼ばれたことを確認
    // wasmModuleの具体的な内容はモックなので、呼ばれたことだけ確認
    expect(initWasm).toHaveBeenCalledWith(expect.anything())
  })

  it('initWasmがエラーを投げた場合、エラーが伝播する', async () => {
    const { initWasm } = await import('@resvg/resvg-wasm')
    const testError = new Error('WASM initialization failed')

    // initWasmがエラーを投げるようにモック
    vi.mocked(initWasm).mockRejectedValueOnce(testError)

    // モジュールを再インポート
    const { ensureWasmInitialized: freshEnsureWasmInitialized } = await import('./wasm?t=' + Date.now())

    // エラーが伝播することを確認
    await expect(freshEnsureWasmInitialized()).rejects.toThrow('WASM initialization failed')
  })

  it('エラー後の再呼び出しで再度初期化を試みる', async () => {
    const { initWasm } = await import('@resvg/resvg-wasm')

    // モジュールを再インポート
    const { ensureWasmInitialized: freshEnsureWasmInitialized } = await import('./wasm?t=' + Date.now())

    // 1回目はエラー
    vi.mocked(initWasm).mockRejectedValueOnce(new Error('First attempt failed'))
    await expect(freshEnsureWasmInitialized()).rejects.toThrow('First attempt failed')

    // 2回目は成功
    vi.mocked(initWasm).mockResolvedValueOnce(undefined)
    await expect(freshEnsureWasmInitialized()).resolves.toBeUndefined()

    // 合計2回呼ばれることを確認（エラー時にはキャッシュしない）
    expect(initWasm).toHaveBeenCalledTimes(2)
  })
})
