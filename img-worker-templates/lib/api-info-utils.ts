/**
 * API接続情報を生成するためのユーティリティ関数
 */

import { TextElement } from './api';

export interface ApiEndpoints {
  production: string;
  local: string;
}

/**
 * APIエンドポイントのURLを生成する
 */
export function buildApiEndpoints(templateId: string): ApiEndpoints {
  return {
    production: 'https://ogp-worker.tomohirof.workers.dev/render',
    local: 'http://localhost:8008/render',
  };
}

/**
 * cURLコマンド例を生成する
 */
export function buildCurlExample(
  templateId: string,
  apiKey: string,
  baseUrl: string,
  params: string[]
): string {
  const dataObj: Record<string, string> = {};
  params.forEach((param) => {
    dataObj[param] = `あなたの${param}`;
  });

  const dataStr = JSON.stringify({
    templateId,
    format: 'png',
    data: dataObj,
  }, null, 2).replace(/\n/g, '\n  ');

  return `curl -X POST ${baseUrl}/render \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '${dataStr}' \\
  --output output.png`;
}

/**
 * JavaScriptコード例を生成する
 */
export function buildJavaScriptExample(
  templateId: string,
  apiKey: string,
  baseUrl: string,
  params: string[]
): string {
  const dataObj: Record<string, string> = {};
  params.forEach((param) => {
    dataObj[param] = `あなたの${param}`;
  });

  const dataObjStr = params.length > 0
    ? JSON.stringify(dataObj, null, 4).replace(/\n/g, '\n    ')
    : '{}';

  return `const response = await fetch('${baseUrl}/render', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${apiKey}'
  },
  body: JSON.stringify({
    templateId: '${templateId}',
    format: 'png',
    data: ${dataObjStr}
  })
});

const blob = await response.blob();
// 画像をダウンロードまたは表示`;
}

/**
 * テンプレート要素から必須パラメータを抽出する
 */
export function extractRequiredParams(elements: TextElement[]): string[] {
  // 変数名を抽出し、空文字を除外して重複排除
  const uniqueParams = new Set(
    elements
      .map((el) => el.variable)
      .filter((variable) => variable && variable.trim() !== '')
  );

  // アルファベット順にソート
  return Array.from(uniqueParams).sort();
}
