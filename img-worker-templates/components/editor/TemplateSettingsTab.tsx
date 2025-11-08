'use client';

import { Template } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

interface Props {
  template: Template;
  onUpdateTemplate: (updates: Partial<Template>) => void;
  onUploadBackground: (file: File) => Promise<void>;
  onAddTextElement: () => void;
}

export function TemplateSettingsTab({
  template,
  onUpdateTemplate,
  onUploadBackground,
  onAddTextElement,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndUploadFile = async (file: File) => {
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

  const handleBackgroundUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await validateAndUploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await validateAndUploadFile(file);
  };

  return (
    <div className="space-y-5 p-5">
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
            className={`min-h-[150px] border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isUploading
                ? 'opacity-60 pointer-events-none bg-gray-50 border-gray-300'
                : isDragging
                ? 'bg-blue-50 border-blue-600 border-solid'
                : 'border-blue-500 hover:bg-gray-50 hover:border-blue-600'
            }`}
            onClick={() => !isUploading && document.getElementById('fileInput')?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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

      <div className="pt-4 border-t">
        <Button
          onClick={onAddTextElement}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          + テキスト要素を追加
        </Button>
      </div>
    </div>
  );
}
