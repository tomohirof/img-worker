/**
 * 画像変換サービス
 * 外部URLやR2ストレージの画像をData URLに変換します
 */

import type { Bindings } from '../types'
import { arrayBufferToDataUrl } from '../utils/encoding'

/**
 * 画像URLをData URLに変換
 * ローカル画像URL（/images/*）の場合はR2から直接取得し、
 * 外部URLの場合はfetchで取得してData URLに変換します
 *
 * @param url 画像URL（外部URL または /images/* 形式のローカルパス）
 * @param env Cloudflare Workers の Bindings（R2アクセスに必要）
 * @returns Data URL形式の文字列
 */
export async function toDataUrl(url: string, env?: Bindings): Promise<string> {
  // Check if URL is a local image URL (e.g., http://localhost:8008/images/uploads/...)
  // or production image URL (e.g., https://ogp-worker.tomohirof.workers.dev/images/uploads/...)
  const imagePathMatch = url.match(/\/images\/(.+)$/);

  if (imagePathMatch && env?.IMAGES) {
    // Extract the key (e.g., "uploads/xxx.jpg")
    const key = imagePathMatch[1];

    try {
      // Fetch from R2 directly
      const object = await env.IMAGES.get(key);

      if (!object) {
        throw new Error(`Image not found in R2: ${key}`);
      }

      const buf = await object.arrayBuffer();
      const ct = object.httpMetadata?.contentType || 'image/png';
      return arrayBufferToDataUrl(buf, ct);
    } catch (error) {
      console.error('Failed to fetch image from R2:', error);
      throw error;
    }
  }

  // For external URLs, use fetch as before
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to fetch image');
  const buf = await res.arrayBuffer();
  const ct = res.headers.get('content-type') || 'image/png';
  return arrayBufferToDataUrl(buf, ct);
}
