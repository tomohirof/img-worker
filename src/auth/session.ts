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
  const cookieValue = getCookie(c, SESSION_COOKIE_NAME);
  if (!cookieValue) {
    return null;
  }

  // Cookie値を分解: sessionId:token
  const parts = cookieValue.split(':');
  if (parts.length !== 2) {
    return null;
  }

  const [sessionId, token] = parts;
  return await validateSession(kv, sessionId, token);
}

/**
 * セッションCookieを設定
 */
export function setSessionCookie(
  c: Context,
  sessionId: string,
  token: string,
  isSecure: boolean = true
): void {
  const cookieValue = `${sessionId}:${token}`;

  setCookie(c, SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Strict',
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
