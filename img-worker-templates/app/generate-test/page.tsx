'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, Template } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function GenerateTestPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'sample' | 'custom' | null>(null);

  // フォームデータ（テンプレート変数用）
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<'png' | 'svg'>('png');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.listTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      alert('テンプレートの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (template: Template) => {
    setSelectedTemplate(template);
    setPreviewUrl(null);
    setPreviewType(null);

    // テンプレートの変数に応じてフォームデータを初期化
    const initialData: Record<string, string> = {};
    template.elements.forEach((el) => {
      initialData[el.variable] = `サンプル${el.variable}`;
    });
    setFormData(initialData);

    // テンプレートのサンプルプレビューを自動生成
    try {
      setGenerating(true);
      const blob = await api.renderImage({
        template,
        format: 'png',
        data: initialData,
      });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType('sample');
    } catch (error) {
      console.error('Preview generation error:', error);
      // エラーは無視してプレビューなしで続行
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      alert('テンプレートを選択してください');
      return;
    }

    try {
      setGenerating(true);

      const blob = await api.renderImage({
        template: selectedTemplate,
        format,
        data: formData,
      });

      // プレビュー用のURL生成
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType('custom');
    } catch (error) {
      console.error('Generation error:', error);
      alert('画像生成に失敗しました: ' + (error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `ogp-${selectedTemplate?.name || 'image'}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">画像の生成テスト</h1>
          <p className="text-muted-foreground mt-1">
            テンプレートを選択してOGP画像を生成します
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Form */}
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">テンプレート選択</h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                テンプレートがありません
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.width} × {template.height}px
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Data Input */}
          {selectedTemplate && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">データ入力</h2>

              <div className="space-y-4">
                {selectedTemplate.elements.map((element) => (
                  <div key={element.id}>
                    <label className="block text-sm font-medium mb-2">
                      {element.variable}
                    </label>
                    <Input
                      type="text"
                      value={formData[element.variable] || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [element.variable]: e.target.value,
                        }))
                      }
                      placeholder={`${element.variable}を入力`}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    フォーマット
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'png' | 'svg')}
                  >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                  </select>
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      '画像を生成'
                    )}
                  </Button>

                  {previewUrl && (
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="w-full"
                    >
                      ダウンロード
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">プレビュー</h2>
            {previewUrl && previewType && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                {previewType === 'sample' ? 'テンプレートのプレビュー' : '生成画像'}
              </span>
            )}
          </div>

          <div className="border-2 border-dashed rounded-lg min-h-[400px] flex items-center justify-center bg-gray-50">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Generated preview"
                className="max-w-full h-auto"
              />
            ) : (
              <p className="text-muted-foreground text-center px-4">
                テンプレートを選択すると、プレビューが表示されます
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
