/**
 * ArrayBufferをbase64エンコードされたData URLに変換します。
 * 大きなバッファを扱う際のスタックオーバーフローを防ぐため、チャンク単位で処理します。
 *
 * @param buffer - 変換するArrayBuffer
 * @param contentType - MIMEタイプ（デフォルト: 'image/png'）
 * @returns base64エンコードされたData URL
 */
export function arrayBufferToDataUrl(
  buffer: ArrayBuffer,
  contentType: string = 'image/png'
): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000 // 32KB chunks

  // チャンク単位で処理してスタックオーバーフローを防ぐ
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }

  const base64 = btoa(binary)
  return `data:${contentType};base64,${base64}`
}
