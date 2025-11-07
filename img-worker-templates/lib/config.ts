// API Configuration
function getApiConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  // 開発環境のデフォルト値
  const defaultBaseUrl = 'http://localhost:8787';
  const defaultApiKey = 'cwe8yxq4mtc-HCZ9ebm';

  // 環境変数が未設定の場合は警告を出す
  if (!baseUrl) {
    console.warn(
      `NEXT_PUBLIC_API_BASE_URL が設定されていません。デフォルト値を使用します: ${defaultBaseUrl}`
    );
  }

  if (!apiKey) {
    console.warn(
      `NEXT_PUBLIC_API_KEY が設定されていません。デフォルト値を使用します`
    );
  }

  return {
    BASE_URL: baseUrl || defaultBaseUrl,
    API_KEY: apiKey || defaultApiKey,
  } as const;
}

export const API_CONFIG = getApiConfig();
