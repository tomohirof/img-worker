import {
  ApiKey,
  ApiKeyInfo,
  ApiKeyCreated,
  KV_KEYS,
  MAX_API_KEYS_PER_USER,
} from './types';
import { generateApiKey, hashApiKey, createKeyPreview } from './utils';

/**
 * APIキーを作成
 *
 * @param kv - KV Namespace
 * @param userId - ユーザーID
 * @param name - APIキーの名前
 * @returns 作成されたAPIキー情報（生成されたAPIキーを含む）
 * @throws ユーザーのAPIキー数が上限に達している場合
 */
export async function createApiKey(
  kv: KVNamespace,
  userId: string,
  name: string
): Promise<ApiKeyCreated> {
  // ユーザーの既存のAPIキー数をチェック
  const existingKeys = await getUserApiKeys(kv, userId);
  if (existingKeys.length >= MAX_API_KEYS_PER_USER) {
    throw new Error(
      `APIキーの作成上限（${MAX_API_KEYS_PER_USER}個）に達しています`
    );
  }

  // APIキーを生成
  const apiKey = generateApiKey();
  const keyHash = await hashApiKey(apiKey);
  const keyId = crypto.randomUUID();
  const now = Date.now();

  const apiKeyData: ApiKey = {
    keyId,
    userId,
    name,
    keyHash,
    createdAt: now,
    isActive: true,
  };

  // ユーザーのAPIキーリストを取得または初期化
  const userKeysData = await kv.get(KV_KEYS.userApiKeys(userId));
  const userKeys: string[] = userKeysData ? JSON.parse(userKeysData) : [];
  userKeys.push(keyId);

  // KVに保存（3つのキーを並列で保存）
  await Promise.all([
    kv.put(KV_KEYS.apiKeyById(keyId), JSON.stringify(apiKeyData)),
    kv.put(KV_KEYS.apiKeyByHash(keyHash), keyId),
    kv.put(KV_KEYS.userApiKeys(userId), JSON.stringify(userKeys)),
  ]);

  // 生成されたAPIキーを含むレスポンスを返す
  return {
    ...toApiKeyInfo(apiKeyData, apiKey),
    apiKey, // 生成されたAPIキー（この時だけ返す）
  };
}

/**
 * keyIdでAPIキーを取得
 *
 * @param kv - KV Namespace
 * @param keyId - APIキーのID
 * @returns APIキー情報、存在しない場合はnull
 */
export async function getApiKeyById(
  kv: KVNamespace,
  keyId: string
): Promise<ApiKey | null> {
  const data = await kv.get(KV_KEYS.apiKeyById(keyId));
  if (!data) {
    return null;
  }
  return JSON.parse(data) as ApiKey;
}

/**
 * ハッシュ値でAPIキーを検証
 * 認証時に使用します
 *
 * @param kv - KV Namespace
 * @param apiKey - 検証するAPIキー（平文）
 * @returns APIキー情報、無効または存在しない場合はnull
 */
export async function validateApiKey(
  kv: KVNamespace,
  apiKey: string
): Promise<ApiKey | null> {
  const keyHash = await hashApiKey(apiKey);
  const keyId = await kv.get(KV_KEYS.apiKeyByHash(keyHash));

  if (!keyId) {
    return null;
  }

  const apiKeyData = await getApiKeyById(kv, keyId);

  // 無効なキーはnullを返す
  if (!apiKeyData || !apiKeyData.isActive) {
    return null;
  }

  return apiKeyData;
}

/**
 * ユーザーの全APIキーを取得
 *
 * @param kv - KV Namespace
 * @param userId - ユーザーID
 * @returns ユーザーのAPIキー情報リスト
 */
export async function getUserApiKeys(
  kv: KVNamespace,
  userId: string
): Promise<ApiKeyInfo[]> {
  const userKeysData = await kv.get(KV_KEYS.userApiKeys(userId));
  if (!userKeysData) {
    return [];
  }

  const keyIds: string[] = JSON.parse(userKeysData);

  // 全てのAPIキーを並列で取得
  const keys = await Promise.all(
    keyIds.map((keyId) => getApiKeyById(kv, keyId))
  );

  // nullを除外してApiKeyInfoに変換
  return keys
    .filter((key): key is ApiKey => key !== null)
    .map((key) => toApiKeyInfo(key));
}

/**
 * APIキーを更新
 *
 * @param kv - KV Namespace
 * @param keyId - APIキーのID
 * @param updates - 更新する内容
 * @returns 更新されたAPIキー情報、存在しない場合はnull
 */
export async function updateApiKey(
  kv: KVNamespace,
  keyId: string,
  updates: { name?: string; isActive?: boolean }
): Promise<ApiKeyInfo | null> {
  const apiKeyData = await getApiKeyById(kv, keyId);
  if (!apiKeyData) {
    return null;
  }

  // 更新内容を反映
  if (updates.name !== undefined) {
    apiKeyData.name = updates.name;
  }
  if (updates.isActive !== undefined) {
    apiKeyData.isActive = updates.isActive;
  }

  // KVに保存
  await kv.put(KV_KEYS.apiKeyById(keyId), JSON.stringify(apiKeyData));

  return toApiKeyInfo(apiKeyData);
}

/**
 * APIキーを削除
 *
 * @param kv - KV Namespace
 * @param keyId - APIキーのID
 * @returns 削除に成功した場合はtrue、存在しない場合はfalse
 */
export async function deleteApiKey(
  kv: KVNamespace,
  keyId: string
): Promise<boolean> {
  const apiKeyData = await getApiKeyById(kv, keyId);
  if (!apiKeyData) {
    return false;
  }

  // ユーザーのAPIキーリストから削除
  const userKeysData = await kv.get(KV_KEYS.userApiKeys(apiKeyData.userId));
  if (userKeysData) {
    const userKeys: string[] = JSON.parse(userKeysData);
    const updatedKeys = userKeys.filter((id) => id !== keyId);
    await kv.put(
      KV_KEYS.userApiKeys(apiKeyData.userId),
      JSON.stringify(updatedKeys)
    );
  }

  // APIキー情報とハッシュインデックスを削除
  await Promise.all([
    kv.delete(KV_KEYS.apiKeyById(keyId)),
    kv.delete(KV_KEYS.apiKeyByHash(apiKeyData.keyHash)),
  ]);

  return true;
}

/**
 * APIキーの最終使用日時を記録
 *
 * @param kv - KV Namespace
 * @param keyId - APIキーのID
 */
export async function recordLastUsed(
  kv: KVNamespace,
  keyId: string
): Promise<void> {
  const apiKeyData = await getApiKeyById(kv, keyId);
  if (!apiKeyData) {
    return;
  }

  apiKeyData.lastUsedAt = Date.now();

  await kv.put(KV_KEYS.apiKeyById(keyId), JSON.stringify(apiKeyData));
}

/**
 * ApiKeyをApiKeyInfoに変換（ハッシュ値を除外）
 *
 * @param apiKey - APIキー情報
 * @param originalKey - 元のAPIキー（省略可能、プレビュー生成用）
 * @returns ユーザー向けAPIキー情報
 */
export function toApiKeyInfo(
  apiKey: ApiKey,
  originalKey?: string
): ApiKeyInfo {
  return {
    keyId: apiKey.keyId,
    userId: apiKey.userId,
    name: apiKey.name,
    keyPreview: originalKey
      ? createKeyPreview(originalKey)
      : '****...****', // 元のキーがない場合はマスクのみ
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt,
    isActive: apiKey.isActive,
  };
}
