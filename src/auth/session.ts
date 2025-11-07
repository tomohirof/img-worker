import { Context } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';

/**
 * セッションの有効期限（7日間）
 */
export const SESSION_EXPIRY_DAYS = 7;
export const SESSION_EXPIRY_SECONDS = SESSION_EXPIRY_DAYS * 24 * 60 * 60;

/**
 * セッションCookieの名前
 */
export const SESSION_COOKIE_NAME = '__session';

/**
 * セッション情報の型
 */
export interface Session {
  sessionId: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  createdAt: number;
  expiresAt: number;
}

/**
 * ランダムなセッショントークンを生成
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * トークンをハッシュ化
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * セッションを作成
 */
export async function createSession(
  kv: KVNamespace,
  userId: string,
  userAgent: string | null
): Promise<{ sessionId: string; token: string }> {
  const sessionId = crypto.randomUUID();
  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const now = Date.now();

  const session: Session = {
    sessionId,
    userId,
    tokenHash,
    userAgent,
    createdAt: now,
    expiresAt: now + SESSION_EXPIRY_SECONDS * 1000,
  };

  await kv.put(
    `session:${sessionId}`,
    JSON.stringify(session),
    { expirationTtl: SESSION_EXPIRY_SECONDS }
  );

  return { sessionId, token };
}

/**
 * セッションを検証
 */
export async function validateSession(
  kv: KVNamespace,
  sessionId: string,
  token: string
): Promise<Session | null> {
  const data = await kv.get(`session:${sessionId}`);
  if (!data) {
    return null;
  }

  const session: Session = JSON.parse(data);

  // 有効期限チェック
  if (session.expiresAt < Date.now()) {
    await deleteSession(kv, sessionId);
    return null;
  }

  // トークンハッシュの検証
  const tokenHash = await hashToken(token);
  if (session.tokenHash !== tokenHash) {
    return null;
  }

  return session;
}

/**
 * セッションを削除
 */
export async function deleteSession(
  kv: KVNamespace,
  sessionId: string
): Promise<void> {
  await kv.delete(`session:${sessionId}`);
}

/**
 * ユーザーの全セッションを削除
 */
export async function deleteAllUserSessions(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  // KVのlist APIを使ってユーザーの全セッションを取得
  const { keys } = await kv.list({ prefix: 'session:' });

  const deletePromises = keys.map(async (key) => {
    const data = await kv.get(key.name);
    if (data) {
      const session: Session = JSON.parse(data);
      if (session.userId === userId) {
        await kv.delete(key.name);
      }
    }
  });

  await Promise.all(deletePromises);
}

/**
 * Contextからセッションを取得
 */
export async function getSessionFromContext(
  c: Context,
  kv: KVNamespace
): Promise<Session | null> {
  // まずAuthorizationヘッダーをチェック（トークンベース認証）
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const tokenValue = authHeader.substring(7); // "Bearer "を除去
    const parts = tokenValue.split(':');
    if (parts.length === 2) {
      const [sessionId, token] = parts;
      return await validateSession(kv, sessionId, token);
    }
  }

  // 次にCookieをチェック（Cookieベース認証）
  const cookieValue = getCookie(c, SESSION_COOKIE_NAME);
  if (cookieValue) {
    const parts = cookieValue.split(':');
    if (parts.length === 2) {
      const [sessionId, token] = parts;
      return await validateSession(kv, sessionId, token);
    }
  }

  return null;
}

/**
 * セッションCookieを設定
 */
export function setSessionCookie(
  c: Context,
  sessionId: string,
  token: string
): void {
  const cookieValue = `${sessionId}:${token}`;

  // Originヘッダーを見て、localhost の場合は secure を false にする
  const origin = c.req.header('Origin') || '';
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

  setCookie(c, SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: !isLocalhost, // localhostの場合はfalse、それ以外はtrue
    sameSite: isLocalhost ? 'Lax' : 'None', // localhostの場合はLax、本番はNone
    path: '/',
    maxAge: SESSION_EXPIRY_SECONDS,
  });
}

/**
 * セッションCookieを削除
 */
export function deleteSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
  });
}
