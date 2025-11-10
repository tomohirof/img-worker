import { describe, it, expect } from 'vitest'
import { arrayBufferToDataUrl } from './encoding'

describe('arrayBufferToDataUrl', () => {
  it('小さなArrayBufferを正しくData URLに変換できる', () => {
    // テストデータ: 'Hello' のUTF-8バイト列
    const buffer = new TextEncoder().encode('Hello').buffer
    const result = arrayBufferToDataUrl(buffer)

    // Data URL形式であることを確認
    expect(result).toMatch(/^data:image\/png;base64,/)

    // base64デコードして元の文字列が復元できることを確認
    const base64 = result.replace('data:image/png;base64,', '')
    const decoded = atob(base64)
    expect(decoded).toBe('Hello')
  })

  it('空のArrayBufferを正しく変換できる', () => {
    const buffer = new ArrayBuffer(0)
    const result = arrayBufferToDataUrl(buffer)

    expect(result).toBe('data:image/png;base64,')
  })

  it('デフォルトのcontentTypeが"image/png"である', () => {
    const buffer = new ArrayBuffer(8)
    const result = arrayBufferToDataUrl(buffer)

    expect(result).toMatch(/^data:image\/png;base64,/)
  })

  it('カスタムcontentTypeを指定できる', () => {
    const buffer = new TextEncoder().encode('test').buffer
    const result = arrayBufferToDataUrl(buffer, 'image/jpeg')

    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('大きなArrayBuffer（32KBを超える）を正しく変換できる', () => {
    // 64KB のデータ
    const largeData = new Uint8Array(64 * 1024)
    // パターンで埋める
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = i % 256
    }

    const result = arrayBufferToDataUrl(largeData.buffer)

    // Data URL形式であることを確認
    expect(result).toMatch(/^data:image\/png;base64,/)

    // base64の長さが期待値に近いことを確認（大まかなチェック）
    const base64 = result.replace('data:image/png;base64,', '')
    expect(base64.length).toBeGreaterThan(85000) // base64は約1.33倍になる
  })
})
