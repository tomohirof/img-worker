/**
 * Cloudflare Workers環境変数の型定義
 */
export interface Bindings {
  API_KEY: string;
  TEMPLATES: KVNamespace;
  IMAGES: R2Bucket;
  ENVIRONMENT?: 'development' | 'production';

  // メール送信関連（Resend）
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  FRONTEND_BASE_URL?: string;
}
