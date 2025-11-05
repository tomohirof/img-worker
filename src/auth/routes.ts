import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { Bindings } from '../types';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from './password';
import {
  createSession,
  getSessionFromContext,
  setSessionCookie,
  deleteSessionCookie,
  deleteSession,
  deleteAllUserSessions,
} from './session';
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserPassword,
  toUserProfile,
} from './user';

// バリデーションスキーマ
const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります'),
});

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'トークンが必要です'),
  newPassword: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります'),
});

const authApp = new Hono<{ Bindings: Bindings }>();

// CORS設定を追加
authApp.use('/*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://img-worker-templates.pages.dev',
    ];

    // 完全一致をチェック
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // *.img-worker-templates.pages.dev のパターンをチェック
    if (origin.match(/^https:\/\/[a-z0-9-]+\.img-worker-templates\.pages\.dev$/)) {
      return origin;
    }

    return allowedOrigins[0]; // デフォルトを返す
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

/**
 * ユーザー登録
 * POST /auth/register
 */
authApp.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
        },
        400
      );
    }

    const { email, password } = validation.data;

    // パスワード強度チェック
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'WEAK_PASSWORD',
          message: passwordValidation.errors[0],
        },
        400
      );
    }

    // ユーザーの存在チェック
    const existingUser = await getUserByEmail(c.env.TEMPLATES, email);
    if (existingUser) {
      return c.json(
        {
          error: 'EMAIL_EXISTS',
          message: 'このメールアドレスは既に登録されています',
        },
        409
      );
    }

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);

    // ユーザーを作成
    const user = await createUser(c.env.TEMPLATES, email, passwordHash);

    // セッションを作成
    const { sessionId, token } = await createSession(
      c.env.TEMPLATES,
      user.userId,
      c.req.header('user-agent') || null
    );

    // セッションCookieを設定（開発環境ではsecure=false）
    const isSecure = c.env.ENVIRONMENT === 'production';
    setSessionCookie(c, sessionId, token, isSecure);

    return c.json(
      {
        user: toUserProfile(user),
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: '登録処理中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * ログイン
 * POST /auth/login
 */
authApp.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
        },
        400
      );
    }

    const { email, password } = validation.data;

    // ユーザーを取得
    const user = await getUserByEmail(c.env.TEMPLATES, email);
    if (!user) {
      return c.json(
        {
          error: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
        401
      );
    }

    // パスワードを検証
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return c.json(
        {
          error: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
        401
      );
    }

    // セッションを作成
    const { sessionId, token } = await createSession(
      c.env.TEMPLATES,
      user.userId,
      c.req.header('user-agent') || null
    );

    // セッションCookieを設定
    const isSecure = c.env.ENVIRONMENT === 'production';
    setSessionCookie(c, sessionId, token, isSecure);

    return c.json({
      user: toUserProfile(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'ログイン処理中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * ログアウト
 * POST /auth/logout
 */
authApp.post('/logout', async (c) => {
  try {
    const session = await getSessionFromContext(c, c.env.TEMPLATES);

    if (session) {
      await deleteSession(c.env.TEMPLATES, session.sessionId);
    }

    deleteSessionCookie(c);

    return c.json({ message: 'ログアウトしました' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'ログアウト処理中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * セッション取得
 * GET /auth/session
 */
authApp.get('/session', async (c) => {
  try {
    const session = await getSessionFromContext(c, c.env.TEMPLATES);

    if (!session) {
      return c.json(
        {
          error: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
        401
      );
    }

    const user = await getUserById(c.env.TEMPLATES, session.userId);

    if (!user) {
      return c.json(
        {
          error: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
        404
      );
    }

    return c.json({
      user: toUserProfile(user),
      session: {
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'セッション確認中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * パスワードリセット要求
 * POST /auth/password/reset/request
 */
authApp.post('/password/reset/request', async (c) => {
  try {
    const body = await c.req.json();
    const validation = passwordResetRequestSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
        },
        400
      );
    }

    const { email } = validation.data;

    // ユーザーを取得
    const user = await getUserByEmail(c.env.TEMPLATES, email);

    // セキュリティのため、ユーザーが存在しない場合も同じレスポンスを返す
    if (!user) {
      return c.json({
        message:
          'メールアドレスが登録されている場合、パスワードリセット用のリンクを送信しました',
      });
    }

    // リセットトークンを生成
    const resetToken = Array.from(
      crypto.getRandomValues(new Uint8Array(32))
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // トークンをハッシュ化して保存
    const encoder = new TextEncoder();
    const data = encoder.encode(resetToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const resetId = crypto.randomUUID();
    await c.env.TEMPLATES.put(
      `reset:${resetId}`,
      JSON.stringify({
        userId: user.userId,
        tokenHash,
        createdAt: Date.now(),
      }),
      { expirationTtl: 900 } // 15分
    );

    // TODO: メール送信機能を実装（Resend統合）
    // 現在は開発用にトークンをログ出力
    console.log('Password reset token:', resetToken);
    console.log('Reset ID:', resetId);
    console.log(
      'Reset URL:',
      `http://localhost:3000/reset?id=${resetId}&token=${resetToken}`
    );

    return c.json({
      message:
        'メールアドレスが登録されている場合、パスワードリセット用のリンクを送信しました',
      // 開発環境用
      ...(c.env.ENVIRONMENT !== 'production' && {
        resetId,
        resetToken,
      }),
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'パスワードリセット要求中にエラーが発生しました',
      },
      500
    );
  }
});

/**
 * パスワードリセット実行
 * POST /auth/password/reset/confirm
 */
authApp.post('/password/reset/confirm', async (c) => {
  try {
    const body = await c.req.json();
    const validation = passwordResetConfirmSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
        },
        400
      );
    }

    const { token, newPassword } = validation.data;

    // トークンからリセットIDを取得（URLパラメータから）
    const url = new URL(c.req.url);
    const resetId = url.searchParams.get('id');

    if (!resetId) {
      return c.json(
        {
          error: 'INVALID_TOKEN',
          message: '無効なトークンです',
        },
        400
      );
    }

    // リセット情報を取得
    const resetData = await c.env.TEMPLATES.get(`reset:${resetId}`);
    if (!resetData) {
      return c.json(
        {
          error: 'INVALID_TOKEN',
          message: 'トークンが無効または期限切れです',
        },
        400
      );
    }

    const resetInfo = JSON.parse(resetData);

    // トークンを検証
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (tokenHash !== resetInfo.tokenHash) {
      return c.json(
        {
          error: 'INVALID_TOKEN',
          message: '無効なトークンです',
        },
        400
      );
    }

    // パスワード強度チェック
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return c.json(
        {
          error: 'WEAK_PASSWORD',
          message: passwordValidation.errors[0],
        },
        400
      );
    }

    // パスワードを更新
    const newPasswordHash = await hashPassword(newPassword);
    const success = await updateUserPassword(
      c.env.TEMPLATES,
      resetInfo.userId,
      newPasswordHash
    );

    if (!success) {
      return c.json(
        {
          error: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
        404
      );
    }

    // リセットトークンを削除
    await c.env.TEMPLATES.delete(`reset:${resetId}`);

    // 全セッションを無効化
    await deleteAllUserSessions(c.env.TEMPLATES, resetInfo.userId);

    return c.json({
      message: 'パスワードをリセットしました',
    });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'パスワードリセット処理中にエラーが発生しました',
      },
      500
    );
  }
});

export default authApp;
