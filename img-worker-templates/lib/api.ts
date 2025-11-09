// API Client for img-worker
import { API_CONFIG } from './config';

const API_BASE_URL = API_CONFIG.BASE_URL;
const API_KEY = API_CONFIG.API_KEY;

export interface TextElement {
  id: string;
  variable: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  fontSize: number;
  minFontSize?: number;
  fontFamily: 'Noto Sans JP' | 'Noto Serif JP';
  color: string;
  fontWeight: 400 | 700;
  textAlign: 'left' | 'center' | 'right';
}

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  background: {
    type: 'color' | 'image' | 'upload';
    value: string;
  };
  elements: TextElement[];
  thumbnailUrl?: string;  // サムネイル画像のURL
  createdAt: string;
  updatedAt: string;
}

export type CreateTemplateInput = Omit<Template, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTemplateInput = Partial<CreateTemplateInput>;

// API Key Types
export interface ApiKeyInfo {
  keyId: string;
  userId: string;
  name: string;
  keyPreview: string;
  createdAt: number;
  lastUsedAt?: number;
  isActive: boolean;
}

export interface ApiKeyCreated extends ApiKeyInfo {
  apiKey: string;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  isActive?: boolean;
}

class APIClient {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // localStorageからトークンを取得してAuthorizationヘッダーとして送信
    const token = typeof window !== 'undefined' ? localStorage.getItem('__session') : null;

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Cookieも送信（互換性のため）
    });

    if (!response.ok) {
      // 401エラーの場合、トークンを削除してログインページにリダイレクト
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('__session');
          window.location.href = '/login';
        }
      }

      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Template APIs
  async listTemplates(): Promise<Template[]> {
    return this.request<Template[]>('/templates');
  }

  async getTemplate(id: string): Promise<Template> {
    return this.request<Template>(`/templates/${id}`);
  }

  async createTemplate(data: CreateTemplateInput): Promise<Template> {
    return this.request<Template>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string, data: UpdateTemplateInput): Promise<Template> {
    return this.request<Template>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Generate thumbnail for a template
  async generateThumbnail(template: Template): Promise<{ thumbnailUrl: string }> {
    return this.request<{ thumbnailUrl: string }>('/templates/thumbnail', {
      method: 'POST',
      body: JSON.stringify({ template }),
    });
  }

  // Image Upload API
  async uploadImage(file: File): Promise<{
    success: boolean;
    fileId: string;
    key: string;
    url: string;
    size: number;
    type: string;
  }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${this.baseURL}/images/upload`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Render API
  async renderImage(params: {
    template?: string | Template;
    templateId?: string;
    format?: 'png' | 'svg';
    width?: number;
    height?: number;
    data: Record<string, string>;
  }): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Render Error: ${response.status} - ${errorText}`);
    }

    return response.blob();
  }

  // API Key APIs
  async listApiKeys(): Promise<ApiKeyInfo[]> {
    const result = await this.request<{ apiKeys: ApiKeyInfo[] }>('/api-keys');
    return result.apiKeys;
  }

  async getApiKey(keyId: string): Promise<ApiKeyInfo> {
    const result = await this.request<{ apiKey: ApiKeyInfo }>(`/api-keys/${keyId}`);
    return result.apiKey;
  }

  async createApiKey(data: CreateApiKeyRequest): Promise<ApiKeyCreated> {
    return this.request<ApiKeyCreated>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApiKey(keyId: string, data: UpdateApiKeyRequest): Promise<ApiKeyInfo> {
    return this.request<ApiKeyInfo>(`/api-keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteApiKey(keyId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new APIClient(API_BASE_URL, API_KEY);
