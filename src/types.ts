/**
 * Cloudflare Workers環境変数の型定義
 */
export interface Bindings {
  API_KEY: string;
  TEMPLATES: KVNamespace;
  IMAGES: R2Bucket;
  ENVIRONMENT?: 'development' | 'production';
}
