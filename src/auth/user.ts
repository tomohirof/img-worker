/**
 * ユーザー情報の型
 */
export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * ユーザーのプロフィール（パスワードを除外）
 */
export interface UserProfile {
  userId: string;
  email: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * メールアドレスを正規化
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * メールアドレスをハッシュ化（インデックス用）
 */
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizeEmail(email));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * ユーザーを作成
 */
export async function createUser(
  kv: KVNamespace,
  email: string,
  passwordHash: string
): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  const userId = crypto.randomUUID();
  const now = Date.now();

  const user: User = {
    userId,
    email: normalizedEmail,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  const emailHash = await hashEmail(normalizedEmail);

  // ユーザーデータとメールインデックスを保存
  await Promise.all([
    kv.put(`user:id:${userId}`, JSON.stringify(user)),
    kv.put(`user:email:${emailHash}`, userId),
  ]);

  return user;
}

/**
 * ユーザーIDでユーザーを取得
 */
export async function getUserById(
  kv: KVNamespace,
  userId: string
): Promise<User | null> {
  const data = await kv.get(`user:id:${userId}`);
  if (!data) {
    return null;
  }
  return JSON.parse(data) as User;
}

/**
 * メールアドレスでユーザーを取得
 */
export async function getUserByEmail(
  kv: KVNamespace,
  email: string
): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = await hashEmail(normalizedEmail);
  const userId = await kv.get(`user:email:${emailHash}`);

  if (!userId) {
    return null;
  }

  return await getUserById(kv, userId);
}

/**
 * ユーザーのパスワードを更新
 */
export async function updateUserPassword(
  kv: KVNamespace,
  userId: string,
  newPasswordHash: string
): Promise<boolean> {
  const user = await getUserById(kv, userId);
  if (!user) {
    return false;
  }

  user.passwordHash = newPasswordHash;
  user.updatedAt = Date.now();

  await kv.put(`user:id:${userId}`, JSON.stringify(user));
  return true;
}

/**
 * ユーザーを削除
 */
export async function deleteUser(
  kv: KVNamespace,
  userId: string
): Promise<boolean> {
  const user = await getUserById(kv, userId);
  if (!user) {
    return false;
  }

  const emailHash = await hashEmail(user.email);

  // ユーザーデータとメールインデックスを削除
  await Promise.all([
    kv.delete(`user:id:${userId}`),
    kv.delete(`user:email:${emailHash}`),
  ]);

  return true;
}

/**
 * UserをUserProfileに変換（パスワードを除外）
 */
export function toUserProfile(user: User): UserProfile {
  return {
    userId: user.userId,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
