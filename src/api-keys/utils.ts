import { API_KEY_LENGTH } from './types';

/**
 * 暗号論的に安全なAPIキーを生成
 * 64文字の16進数文字列を生成します
 *
 * @returns 生成されたAPIキー（64文字の16進数文字列）
 */
export function generateApiKey(): string {
  // 32バイト（64文字の16進数）を生成
  const bytes = crypto.getRandomValues(new Uint8Array(API_KEY_LENGTH / 2));

  // バイト配列を16進数文字列に変換
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * APIキーをSHA-256でハッシュ化
 * KVに保存する際は、平文ではなくハッシュ値を保存します
 *
 * @param apiKey - ハッシュ化するAPIキー
 * @returns ハッシュ値（64文字の16進数文字列）
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * APIキーのプレビュー文字列を作成
 * セキュリティのため、末尾8文字のみを表示します
 *
 * @param apiKey - プレビューを作成するAPIキー
 * @returns プレビュー文字列（例: "****...abc12345"）
 */
export function createKeyPreview(apiKey: string): string {
  if (apiKey.length < 8) {
    // 短すぎる場合は全てマスク
    return '****';
  }

  // 末尾8文字を表示、残りはマスク
  const visiblePart = apiKey.slice(-8);
  return `****...${visiblePart}`;
}
