/**
 * APIキーの情報
 */
export interface ApiKey {
  /** APIキーのID（UUID） */
  keyId: string;

  /** 所有者のユーザーID */
  userId: string;

  /** キーの名前（ユーザーが識別用に付ける） */
  name: string;

  /** APIキーのハッシュ値（SHA-256） */
  keyHash: string;

  /** 作成日時（ミリ秒） */
  createdAt: number;

  /** 最終使用日時（ミリ秒） */
  lastUsedAt?: number;

  /** 有効/無効フラグ */
  isActive: boolean;
}

/**
 * ユーザー向けのAPIキー情報（ハッシュ値を含まない）
 */
export interface ApiKeyInfo {
  /** APIキーのID */
  keyId: string;

  /** 所有者のユーザーID */
  userId: string;

  /** キーの名前 */
  name: string;

  /** APIキーの最後の4文字（表示用） */
  keyPreview: string;

  /** 作成日時 */
  createdAt: number;

  /** 最終使用日時 */
  lastUsedAt?: number;

  /** 有効/無効フラグ */
  isActive: boolean;
}

/**
 * APIキー作成時のレスポンス（実際のキーを含む）
 */
export interface ApiKeyCreated extends ApiKeyInfo {
  /** 生成されたAPIキー（一度のみ表示） */
  apiKey: string;
}

/**
 * APIキー作成時のリクエスト
 */
export interface CreateApiKeyRequest {
  /** キーの名前 */
  name: string;
}

/**
 * APIキー更新時のリクエスト
 */
export interface UpdateApiKeyRequest {
  /** キーの名前（オプション） */
  name?: string;

  /** 有効/無効フラグ（オプション） */
  isActive?: boolean;
}

/**
 * KV Namespaceのキー構造
 */
export const KV_KEYS = {
  /** APIキー情報: apikey:id:{keyId} */
  apiKeyById: (keyId: string) => `apikey:id:${keyId}`,

  /** ハッシュからキーIDへのインデックス: apikey:hash:{keyHash} */
  apiKeyByHash: (keyHash: string) => `apikey:hash:${keyHash}`,

  /** ユーザーのAPIキーID一覧: user:apikeys:{userId} */
  userApiKeys: (userId: string) => `user:apikeys:${userId}`,
} as const;

/**
 * APIキーの最大作成数
 */
export const MAX_API_KEYS_PER_USER = 10;

/**
 * APIキーの長さ（文字数）
 */
export const API_KEY_LENGTH = 64;
