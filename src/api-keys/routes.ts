import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { getSessionFromContext } from '../auth/session';
import {
  createApiKey,
  getUserApiKeys,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
} from './api-key';
import { CreateApiKeyRequest, UpdateApiKeyRequest } from './types';

// バリデーションスキーマ
const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'APIキー名を入力してください')
    .max(100, 'APIキー名は100文字以内で入力してください'),
});

const updateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'APIキー名を入力してください')
    .max(100, 'APIキー名は100文字以内で入力してください')
    .optional(),
  isActive: z.boolean().optional(),
});

const apiKeysApp = new Hono<{ Bindings: Bindings }>();

/**
 * セッション認証が必要なミドルウェア
 */
async function requireSession(c: any, next: any) {
  const session = await getSessionFromContext(c, c.env.TEMPLATES);

  if (!session) {
    return c.json(
      {
        error: 'UNAUTHORIZED',
        message: 'ログインが必要です',
      },
      401
    );
  }

  // contextにユーザーIDを設定
  c.set('userId', session.userId);

  await next();
}

// 全てのエンドポイントでセッション認証を要求
apiKeysApp.use('/*', requireSession);

/**
 * APIキー一覧を取得
 * GET /api-keys
 */
apiKeysApp.get('/', async (c) => {
  try {
    const userId = c.get('userId');

    const apiKeys = await getUserApiKeys(c.env.TEMPLATES, userId);

    return c.json({ apiKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'APIキー一覧の取得中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * APIキーを作成
 * POST /api-keys
 */
apiKeysApp.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const validation = createApiKeySchema.safeParse(body);

    if (!validation.success) {
      const errorMessage =
        validation.error?.errors?.[0]?.message ||
        'バリデーションエラーが発生しました';
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: errorMessage,
        },
        400
      );
    }

    const { name } = validation.data;

    const apiKeyCreated = await createApiKey(c.env.TEMPLATES, userId, name);

    return c.json(apiKeyCreated, 201);
  } catch (error) {
    console.error('Create API key error:', error);

    // 作成上限エラー
    if (error instanceof Error && error.message.includes('作成上限')) {
      return c.json(
        {
          error: 'LIMIT_EXCEEDED',
          message: error.message,
        },
        400
      );
    }

    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'APIキーの作成中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * 特定のAPIキーを取得
 * GET /api-keys/:keyId
 */
apiKeysApp.get('/:keyId', async (c) => {
  try {
    const userId = c.get('userId');
    const keyId = c.req.param('keyId');

    const apiKey = await getApiKeyById(c.env.TEMPLATES, keyId);

    if (!apiKey) {
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'APIキーが見つかりません',
        },
        404
      );
    }

    // 自分のAPIキーかチェック
    if (apiKey.userId !== userId) {
      return c.json(
        {
          error: 'FORBIDDEN',
          message: 'このAPIキーにアクセスする権限がありません',
        },
        403
      );
    }

    return c.json({ apiKey });
  } catch (error) {
    console.error('Get API key error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'APIキーの取得中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * APIキーを更新
 * PATCH /api-keys/:keyId
 */
apiKeysApp.patch('/:keyId', async (c) => {
  try {
    const userId = c.get('userId');
    const keyId = c.req.param('keyId');
    const body = await c.req.json();
    const validation = updateApiKeySchema.safeParse(body);

    if (!validation.success) {
      const errorMessage =
        validation.error?.errors?.[0]?.message ||
        'バリデーションエラーが発生しました';
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: errorMessage,
        },
        400
      );
    }

    // 自分のAPIキーかチェック
    const existingKey = await getApiKeyById(c.env.TEMPLATES, keyId);
    if (!existingKey) {
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'APIキーが見つかりません',
        },
        404
      );
    }

    if (existingKey.userId !== userId) {
      return c.json(
        {
          error: 'FORBIDDEN',
          message: 'このAPIキーを更新する権限がありません',
        },
        403
      );
    }

    const updatedKey = await updateApiKey(
      c.env.TEMPLATES,
      keyId,
      validation.data
    );

    if (!updatedKey) {
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'APIキーが見つかりません',
        },
        404
      );
    }

    return c.json(updatedKey);
  } catch (error) {
    console.error('Update API key error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'APIキーの更新中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * APIキーを削除
 * DELETE /api-keys/:keyId
 */
apiKeysApp.delete('/:keyId', async (c) => {
  try {
    const userId = c.get('userId');
    const keyId = c.req.param('keyId');

    // 自分のAPIキーかチェック
    const existingKey = await getApiKeyById(c.env.TEMPLATES, keyId);
    if (!existingKey) {
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'APIキーが見つかりません',
        },
        404
      );
    }

    if (existingKey.userId !== userId) {
      return c.json(
        {
          error: 'FORBIDDEN',
          message: 'このAPIキーを削除する権限がありません',
        },
        403
      );
    }

    const success = await deleteApiKey(c.env.TEMPLATES, keyId);

    if (!success) {
      return c.json(
        {
          error: 'NOT_FOUND',
          message: 'APIキーが見つかりません',
        },
        404
      );
    }

    return c.json({ message: 'APIキーを削除しました' });
  } catch (error) {
    console.error('Delete API key error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'APIキーの削除中にエラーが発生しました',
      },
      500
    );
  }
});

export default apiKeysApp;
