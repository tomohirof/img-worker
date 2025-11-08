'use client';

import { Template, TextElement } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { TemplateSettingsTab } from './TemplateSettingsTab';
import { ApiInfoTab } from './ApiInfoTab';

interface Props {
  template: Template;
  selectedElementId: string | null;
  onUpdateTemplate: (updates: Partial<Template>) => void;
  onUpdateElement: (id: string, updates: Partial<TextElement>) => void;
  onDeleteElement: () => void;
  onUploadBackground: (file: File) => Promise<void>;
  onAddTextElement: () => void;
}

type TabType = 'settings' | 'api';

export function PropertiesPanel({
  template,
  selectedElementId,
  onUpdateTemplate,
  onUpdateElement,
  onDeleteElement,
  onUploadBackground,
  onAddTextElement,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('settings');

  const selectedElement = template.elements.find(
    (el) => el.id === selectedElementId
  );

  // 要素が選択されていない場合はタブ表示
  if (!selectedElement) {
    const showApiTab = template.id && template.id.trim() !== '';

    return (
      <div className="w-[350px] bg-white border-l overflow-y-auto">
        {/* タブヘッダー */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            テンプレート設定
          </button>
          {showApiTab && (
            <button
              onClick={() => setActiveTab('api')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'api'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              API情報
            </button>
          )}
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'settings' && (
          <TemplateSettingsTab
            template={template}
            onUpdateTemplate={onUpdateTemplate}
            onUploadBackground={onUploadBackground}
            onAddTextElement={onAddTextElement}
          />
        )}
        {activeTab === 'api' && showApiTab && (
          <ApiInfoTab template={template} />
        )}
      </div>
    );
  }

  // 要素が選択されている場合は要素のプロパティを表示
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
              onUpdateElement(selectedElement.id, {
                fontFamily: e.target.value as 'Noto Sans JP' | 'Noto Serif JP',
              })
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
                fontWeight: parseInt(e.target.value) as 400 | 700,
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
