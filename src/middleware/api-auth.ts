import { Context, Next } from 'hono';
import type { Bindings } from '../types';
import { validateApiKey, recordLastUsed } from '../api-keys/api-key';

/**
 * APIキー認証ミドルウェア
 *
 * リクエストからAPIキーを取得し、検証します。
 * APIキーは以下の方法で渡すことができます：
 * - ヘッダー: x-api-key
 * - クエリパラメータ: api_key
 *
 * 認証に成功すると、c.set('apiUserId', userId) でユーザーIDが設定されます。
 */
export async function requireApiKeyAuth(
  c: Context<{ Bindings: Bindings }>,
  next: Next
) {
  // ヘッダーまたはクエリパラメータからAPIキーを取得
  const headerApiKey = c.req.header('x-api-key');
  const queryApiKey = c.req.query('api_key');
  const apiKey = headerApiKey || queryApiKey;

  if (!apiKey) {
    return c.json(
      {
        error: 'UNAUTHORIZED',
        message: 'APIキーが必要です',
      },
      401
    );
  }

  // APIキーを検証
  const apiKeyData = await validateApiKey(c.env.TEMPLATES, apiKey);

  if (!apiKeyData) {
    return c.json(
      {
        error: 'UNAUTHORIZED',
        message: '無効なAPIキーです',
      },
      401
    );
  }

  // 最終使用日時を記録（非同期で実行、エラーは無視）
  recordLastUsed(c.env.TEMPLATES, apiKeyData.keyId).catch((error) => {
    console.error('Failed to record last used:', error);
  });

  // contextにユーザーIDを設定
  c.set('apiUserId', apiKeyData.userId);

  await next();
}

/**
 * contextからAPIキー認証されたユーザーIDを取得
 */
export function getApiUserId(c: Context): string | undefined {
  return c.get('apiUserId');
}
