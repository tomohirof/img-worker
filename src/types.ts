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

  // 画像の公開URL用ベースURL
  PUBLIC_IMAGE_BASE_URL?: string;
}

/**
 * テンプレート内のテキスト要素の型定義
 */
export interface TextElement {
  id: string
  variable: string  // e.g., "title", "category"
  x: number
  y: number
  width?: number
  height?: number
  maxWidth?: number  // Maximum width for text wrapping
  maxHeight?: number  // Maximum height for text (triggers font size adjustment)
  fontSize: number
  minFontSize?: number  // Minimum font size when auto-adjusting (default: fontSize / 2)
  fontFamily: 'Noto Sans JP' | 'Noto Serif JP'
  color: string
  fontWeight: 400 | 700
  textAlign: 'left' | 'center' | 'right'
}

/**
 * OGP画像生成テンプレートの型定義
 */
export interface Template {
  id: string
  name: string
  width: number
  height: number
  background: {
    type: 'color' | 'image' | 'upload'
    value: string  // color code or image URL
  }
  elements: TextElement[]
  thumbnailUrl?: string  // サムネイル画像のURL
  createdAt: string
  updatedAt: string
}

/**
 * レンダリングAPIへの入力型定義
 */
export type RenderInput = {
  template?: string | Template  // 'magazine-basic' or template object for preview
  templateId?: string  // Template ID from KV
  format?: 'png' | 'svg'
  width?: number
  height?: number
  data: Record<string, string> | {
    title: string
    subtitle?: string
    brand?: string
    textColor?: string
    bgColor?: string
    cover?: { image_url: string; opacity?: number; fit?: 'cover' | 'contain' }
  }
}
