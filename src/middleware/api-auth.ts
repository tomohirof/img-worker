import { Context, Next } from 'hono';
import type { Bindings } from '../types';
import { validateApiKey, recordLastUsed } from '../api-keys/api-key';

/**
 * APIキー認証ミドルウェア
 *
 * リクエストからAPIキーを取得し、検証します。
 * APIキーはHTTPヘッダー（x-api-key）で渡す必要があります。
 *
 * 認証に成功すると、c.set('apiUserId', userId) でユーザーIDが設定されます。
 */
export async function requireApiKeyAuth(
  c: Context<{ Bindings: Bindings }>,
  next: Next
) {
  // HTTPヘッダーからAPIキーを取得（セキュリティ上、クエリパラメータは使用しない）
  const apiKey = c.req.header('x-api-key');

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

/**
 * APIキー認証（後方互換性のため環境変数もサポート）
 *
 * ヘッダー（x-api-key）またはクエリパラメータ（api_key）からAPIキーを取得し、
 * ユーザー固有のAPIキーを優先して検証します。
 * 見つからない場合は環境変数API_KEYもチェックします（後方互換性）。
 *
 * @returns エラーレスポンス、またはnull（認証成功）
 */
export async function requireApiKey(c: Context<{ Bindings: Bindings }>) {
  const q = c.req.query('api_key')
  const h = c.req.header('x-api-key')
  const provided = h || q

  if (!provided) {
    return c.text('Unauthorized: API key required', 401)
  }

  // まずユーザー固有のAPIキーをチェック
  try {
    const apiKeyData = await validateApiKey(c.env.TEMPLATES, provided)
    if (apiKeyData) {
      // 有効なユーザーAPIキーが見つかった
      c.set('apiUserId', apiKeyData.userId)

      // 最終使用日時を記録（非同期で実行、エラーは無視）
      recordLastUsed(c.env.TEMPLATES, apiKeyData.keyId).catch((error) => {
        console.error('Failed to record last used:', error)
      })

      return null
    }
  } catch (error) {
    console.error('API key validation error:', error)
  }

  // フォールバック: 環境変数のAPI_KEYと比較（後方互換性）
  if (c.env.API_KEY && provided === c.env.API_KEY) {
    return null
  }

  return c.text('Unauthorized: Invalid API key', 401)
}
