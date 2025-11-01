'use client';

import { Template, TextElement } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

interface Props {
  template: Template;
  selectedElementId: string | null;
  onUpdateTemplate: (updates: Partial<Template>) => void;
  onUpdateElement: (id: string, updates: Partial<TextElement>) => void;
  onDeleteElement: () => void;
  onUploadBackground: (file: File) => Promise<void>;
}

export function PropertiesPanel({
  template,
  selectedElementId,
  onUpdateTemplate,
  onUpdateElement,
  onDeleteElement,
  onUploadBackground,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);

  const selectedElement = template.elements.find(
    (el) => el.id === selectedElementId
  );

  const handleBackgroundUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルタイプとサイズのバリデーション
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(file.type)) {
      alert(
        '対応していない画像形式です。PNG, JPEG, GIF, WebP, SVGのみアップロード可能です。'
      );
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(
        'ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。'
      );
      return;
    }

    setIsUploading(true);
    try {
      await onUploadBackground(file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('画像のアップロードに失敗しました。もう一度お試しください。');
    } finally {
      setIsUploading(false);
    }
  };

  if (!selectedElement) {
    return (
      <div className="w-[350px] bg-white border-l overflow-y-auto p-5">
        <h2 className="text-lg font-bold mb-5 pb-3 border-b-2 border-blue-500">
          テンプレート設定
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              テンプレート名
            </label>
            <Input
              type="text"
              value={template.name}
              placeholder="例: Tutorial Template"
              onChange={(e) => onUpdateTemplate({ name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              サイズ（幅 x 高さ）
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={template.width}
                min={200}
                max={4096}
                onChange={(e) =>
                  onUpdateTemplate({ width: parseInt(e.target.value) })
                }
              />
              <Input
                type="number"
                value={template.height}
                min={200}
                max={4096}
                onChange={(e) =>
                  onUpdateTemplate({ height: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              背景タイプ
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={template.background.type}
              onChange={(e) =>
                onUpdateTemplate({
                  background: {
                    type: e.target.value as Template['background']['type'],
                    value:
                      e.target.value === 'color'
                        ? '#1e40ff'
                        : template.background.value || '',
                  },
                })
              }
            >
              <option value="color">カラー</option>
              <option value="image">画像URL</option>
              <option value="upload">画像アップロード</option>
            </select>
          </div>

          {template.background.type === 'color' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                背景色
              </label>
              <input
                type="color"
                value={template.background.value}
                className="w-full h-10 rounded-md border border-input cursor-pointer"
                onChange={(e) =>
                  onUpdateTemplate({
                    background: { type: 'color', value: e.target.value },
                  })
                }
              />
            </div>
          )}

          {template.background.type === 'image' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                画像URL
              </label>
              <Input
                type="text"
                value={template.background.value}
                placeholder="https://example.com/image.jpg"
                onChange={(e) =>
                  onUpdateTemplate({
                    background: { type: 'image', value: e.target.value },
                  })
                }
              />
              {template.background.value && (
                <div
                  className="w-full h-24 mt-2 border rounded-md bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${template.background.value})`,
                  }}
                />
              )}
            </div>
          )}

          {template.background.type === 'upload' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                画像をアップロード
              </label>
              <div
                className={`min-h-[150px] border-2 border-dashed border-blue-500 rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isUploading
                    ? 'opacity-60 pointer-events-none bg-gray-50'
                    : 'hover:bg-gray-50 hover:border-blue-600'
                }`}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                {isUploading ? (
                  <div className="text-gray-600">アップロード中...</div>
                ) : template.background.value ? (
                  <>
                    <img
                      src={template.background.value}
                      className="max-w-full max-h-[200px] mx-auto object-contain rounded-md mb-2"
                      alt="プレビュー"
                    />
                    <div className="text-sm text-gray-600">
                      クリックまたはドラッグ&ドロップで画像を変更
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-2">📤</div>
                    <div className="text-sm text-gray-600 mb-1">
                      クリックまたはドラッグ&ドロップで画像をアップロード
                    </div>
                    <div className="text-xs text-gray-500">
                      PNG, JPEG, GIF, WebP, SVG (最大10MB)
                    </div>
                  </>
                )}
              </div>
              <input
                type="file"
                id="fileInput"
                accept="image/*"
                className="hidden"
                onChange={handleBackgroundUpload}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[350px] bg-white border-l overflow-y-auto p-5">
      <h2 className="text-lg font-bold mb-5 pb-3 border-b-2 border-blue-500">
        テキスト要素
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            変数名
          </label>
          <Input
            type="text"
            value={selectedElement.variable}
            onChange={(e) =>
              onUpdateElement(selectedElement.id, { variable: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            位置（X, Y）
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={selectedElement.x}
              min={0}
              max={template.width}
              onChange={(e) =>
                onUpdateElement(selectedElement.id, {
                  x: parseInt(e.target.value),
                })
              }
            />
            <Input
              type="number"
              value={selectedElement.y}
              min={0}
              max={template.height}
              onChange={(e) =>
                onUpdateElement(selectedElement.id, {
                  y: parseInt(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            フォントサイズ
          </label>
          <Input
            type="number"
            value={selectedElement.fontSize}
            min={8}
            max={200}
            onChange={(e) =>
              onUpdateElement(selectedElement.id, {
                fontSize: parseInt(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            最小フォントサイズ（自動調整時）
          </label>
          <Input
            type="number"
            value={
              selectedElement.minFontSize ||
              Math.floor(selectedElement.fontSize / 2)
            }
            min={8}
            max={200}
            onChange={(e) =>
              onUpdateElement(selectedElement.id, {
                minFontSize: parseInt(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            フォントファミリー
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedElement.fontFamily}
            onChange={(e) =>
              onUpdateElement(selectedElement.id, { fontFamily: e.target.value })
            }
          >
            <option value="Noto Sans JP">Noto Sans JP</option>
            <option value="Noto Serif JP">Noto Serif JP</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            フォントウェイト
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedElement.fontWeight}
            onChange={(e) =>
              onUpdateElement(selectedElement.id, {
                fontWeight: parseInt(e.target.value),
              })
            }
          >
            <option value="400">400 (Regular)</option>
            <option value="700">700 (Bold)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            テキスト配置
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedElement.textAlign}
            onChange={(e) =>
              onUpdateElement(selectedElement.id, {
                textAlign: e.target.value as TextElement['textAlign'],
              })
            }
          >
            <option value="left">左揃え</option>
            <option value="center">中央揃え</option>
            <option value="right">右揃え</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            テキスト色
          </label>
          <input
            type="color"
            value={selectedElement.color}
            className="w-full h-10 rounded-md border border-input cursor-pointer"
            onChange={(e) =>
              onUpdateElement(selectedElement.id, { color: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            最大幅（折り返し）
          </label>
          <Input
            type="number"
            value={selectedElement.maxWidth || ''}
            min={50}
            placeholder="未設定"
            onChange={(e) =>
              onUpdateElement(selectedElement.id, {
                maxWidth: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            最大高さ（自動調整）
          </label>
          <Input
            type="number"
            value={selectedElement.maxHeight || ''}
            min={20}
            placeholder="未設定"
            onChange={(e) =>
              onUpdateElement(selectedElement.id, {
                maxHeight: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              })
            }
          />
        </div>

        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full bg-red-50 text-red-600 border-red-300 hover:bg-red-100"
            onClick={onDeleteElement}
          >
            この要素を削除
          </Button>
        </div>
      </div>
    </div>
  );
}
