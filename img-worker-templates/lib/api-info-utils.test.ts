import { describe, it, expect } from 'vitest';
import {
  buildApiEndpoints,
  buildCurlExample,
  buildJavaScriptExample,
  extractRequiredParams,
} from './api-info-utils';
import { TextElement } from './api';

describe('buildApiEndpoints', () => {
  it('本番とローカルのエンドポイントURLを生成する', () => {
    const result = buildApiEndpoints('template-123');

    expect(result).toEqual({
      production: 'https://ogp-worker.tomohirof.workers.dev/render',
      local: 'http://localhost:8008/render',
    });
  });
});

describe('buildCurlExample', () => {
  it('cURLコマンド例を正しく生成する', () => {
    const templateId = 'template-123';
    const apiKey = 'test-api-key';
    const baseUrl = 'https://ogp-worker.tomohirof.workers.dev';
    const params = ['title', 'category'];

    const result = buildCurlExample(templateId, apiKey, baseUrl, params);

    expect(result).toContain('curl -X POST');
    expect(result).toContain(`${baseUrl}/render`);
    expect(result).toContain(`"x-api-key: ${apiKey}"`);
    expect(result).toContain(`"templateId": "${templateId}"`);
    expect(result).toContain('"format": "png"');
    expect(result).toContain('"title":');
    expect(result).toContain('"category":');
  });

  it('パラメータがない場合はdataオブジェクトが空になる', () => {
    const result = buildCurlExample('template-123', 'key', 'https://api.example.com', []);

    expect(result).toContain('"data": {}');
  });
});

describe('buildJavaScriptExample', () => {
  it('JavaScriptコード例を正しく生成する', () => {
    const templateId = 'template-123';
    const apiKey = 'test-api-key';
    const baseUrl = 'https://ogp-worker.tomohirof.workers.dev';
    const params = ['title', 'subtitle'];

    const result = buildJavaScriptExample(templateId, apiKey, baseUrl, params);

    expect(result).toContain('const response = await fetch');
    expect(result).toContain(`'${baseUrl}/render'`);
    expect(result).toContain(`'x-api-key': '${apiKey}'`);
    expect(result).toContain(`templateId: '${templateId}'`);
    expect(result).toContain('format: \'png\'');
    expect(result).toContain('"title":');
    expect(result).toContain('"subtitle":');
    expect(result).toContain('const blob = await response.blob()');
  });

  it('パラメータがない場合はdataオブジェクトが空になる', () => {
    const result = buildJavaScriptExample('template-123', 'key', 'https://api.example.com', []);

    expect(result).toContain('data: {}');
  });
});

describe('extractRequiredParams', () => {
  it('テンプレート要素から変数名を抽出する', () => {
    const elements: TextElement[] = [
      {
        id: 'el1',
        variable: 'title',
        x: 0,
        y: 0,
        fontSize: 32,
        fontFamily: 'Noto Sans JP',
        color: '#000',
        fontWeight: 400,
        textAlign: 'left',
      },
      {
        id: 'el2',
        variable: 'category',
        x: 0,
        y: 50,
        fontSize: 24,
        fontFamily: 'Noto Sans JP',
        color: '#333',
        fontWeight: 400,
        textAlign: 'left',
      },
    ];

    const result = extractRequiredParams(elements);

    expect(result).toEqual(['category', 'title']);
  });

  it('重複する変数名を除外する', () => {
    const elements: TextElement[] = [
      {
        id: 'el1',
        variable: 'title',
        x: 0,
        y: 0,
        fontSize: 32,
        fontFamily: 'Noto Sans JP',
        color: '#000',
        fontWeight: 400,
        textAlign: 'left',
      },
      {
        id: 'el2',
        variable: 'title',
        x: 0,
        y: 50,
        fontSize: 24,
        fontFamily: 'Noto Sans JP',
        color: '#333',
        fontWeight: 400,
        textAlign: 'left',
      },
    ];

    const result = extractRequiredParams(elements);

    expect(result).toEqual(['title']);
  });

  it('空の配列の場合は空配列を返す', () => {
    const result = extractRequiredParams([]);

    expect(result).toEqual([]);
  });

  it('空文字列の変数名を除外する', () => {
    const elements: TextElement[] = [
      {
        id: 'el1',
        variable: '',
        x: 0,
        y: 0,
        fontSize: 32,
        fontFamily: 'Noto Sans JP',
        color: '#000',
        fontWeight: 400,
        textAlign: 'left',
      },
      {
        id: 'el2',
        variable: 'title',
        x: 0,
        y: 50,
        fontSize: 24,
        fontFamily: 'Noto Sans JP',
        color: '#333',
        fontWeight: 400,
        textAlign: 'left',
      },
    ];

    const result = extractRequiredParams(elements);

    expect(result).toEqual(['title']);
  });

  it('変数名をアルファベット順にソートする', () => {
    const elements: TextElement[] = [
      {
        id: 'el1',
        variable: 'subtitle',
        x: 0,
        y: 0,
        fontSize: 32,
        fontFamily: 'Noto Sans JP',
        color: '#000',
        fontWeight: 400,
        textAlign: 'left',
      },
      {
        id: 'el2',
        variable: 'title',
        x: 0,
        y: 50,
        fontSize: 24,
        fontFamily: 'Noto Sans JP',
        color: '#333',
        fontWeight: 400,
        textAlign: 'left',
      },
      {
        id: 'el3',
        variable: 'category',
        x: 0,
        y: 100,
        fontSize: 20,
        fontFamily: 'Noto Sans JP',
        color: '#666',
        fontWeight: 400,
        textAlign: 'left',
      },
    ];

    const result = extractRequiredParams(elements);

    expect(result).toEqual(['category', 'subtitle', 'title']);
  });
});
