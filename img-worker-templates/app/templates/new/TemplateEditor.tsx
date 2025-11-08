'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Canvas } from '@/components/editor/Canvas';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { Button } from '@/components/ui/Button';
import { api, Template, TextElement } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function TemplateEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');

  const [template, setTemplate] = useState<Template>({
    id: '',
    name: '',
    width: 1200,
    height: 630,
    background: { type: 'upload', value: '' },
    elements: [],
    createdAt: '',
    updatedAt: '',
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load template if editing
  useEffect(() => {
    if (templateId) {
      setIsLoading(true);
      api
        .getTemplate(templateId)
        .then((data) => {
          setTemplate(data);
        })
        .catch((error) => {
          console.error('Failed to load template:', error);
          alert('テンプレートの読み込みに失敗しました');
          router.push('/templates');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [templateId, router]);

  const handleUpdateTemplate = useCallback((updates: Partial<Template>) => {
    setTemplate((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<TextElement>) => {
      setTemplate((prev) => ({
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === id ? { ...el, ...updates } : el
        ),
      }));
    },
    []
  );

  const handleAddTextElement = useCallback(() => {
    const newElement: TextElement = {
      id: `el_${Date.now()}`,
      variable: `text${template.elements.length + 1}`,
      x: 100,
      y: 100 + template.elements.length * 50,
      fontSize: 32,
      fontFamily: 'Noto Sans JP',
      color: '#ffffff',
      fontWeight: 400,
      textAlign: 'left',
      maxWidth: 800,
      maxHeight: 200,
      minFontSize: 16,
    };

    setTemplate((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementId(newElement.id);
  }, [template.elements.length]);

  const handleDeleteElement = useCallback(() => {
    if (!selectedElementId) return;
    if (!confirm('この要素を削除しますか？')) return;

    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== selectedElementId),
    }));
    setSelectedElementId(null);
  }, [selectedElementId]);

  const handleUploadBackground = useCallback(async (file: File) => {
    try {
      const result = await api.uploadImage(file);
      setTemplate((prev) => ({
        ...prev,
        background: { type: 'upload', value: result.url },
      }));
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, []);

  const handlePreview = useCallback(async () => {
    try {
      // Create test data
      const testData: Record<string, string> = {};
      template.elements.forEach((el) => {
        testData[el.variable] = `サンプル${el.variable}`;
      });

      // Generate preview
      const blob = await api.renderImage({
        template: template,
        format: 'png',
        data: testData,
      });

      const url = URL.createObjectURL(blob);

      // Open in new window
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(
          `<img src="${url}" style="max-width: 100%; height: auto;">`
        );
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('プレビュー生成に失敗しました: ' + (error as Error).message);
    }
  }, [template]);

  const handleSave = useCallback(async () => {
    try {
      if (!template.name) {
        alert('テンプレート名を入力してください');
        setSelectedElementId(null); // Show template properties
        return;
      }

      if (template.elements.length === 0) {
        if (!confirm('テキスト要素がありません。このまま保存しますか？'))
          return;
      }

      setIsSaving(true);

      // Remove id, createdAt, updatedAt, thumbnailUrl from payload
      const { id, createdAt, updatedAt, thumbnailUrl, ...payload } = template;

      let savedTemplate: typeof template;
      if (templateId) {
        // Update existing template
        savedTemplate = await api.updateTemplate(templateId, payload);
      } else {
        // Create new template
        savedTemplate = await api.createTemplate(payload);
      }

      // Generate thumbnail
      try {
        const { thumbnailUrl: newThumbnailUrl } = await api.generateThumbnail(savedTemplate);
        // Update template with thumbnail URL
        await api.updateTemplate(savedTemplate.id, { thumbnailUrl: newThumbnailUrl });
        alert('テンプレートとサムネイルを保存しました！');
      } catch (thumbnailError) {
        console.error('Thumbnail generation error:', thumbnailError);
        alert('テンプレートを保存しましたが、サムネイル生成に失敗しました');
      }

      router.push('/templates');
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [template, templateId, router]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-lg">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  const selectedElement =
    template.elements.find((el) => el.id === selectedElementId) || null;

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link
          href="/templates"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          テンプレート一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {templateId ? 'テンプレート編集' : '新規テンプレート作成'}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview}>
              プレビュー
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        <div className="min-w-0">
          <Canvas
            template={template}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
          />
        </div>
        <div className="min-w-0">
          <PropertiesPanel
            template={template}
            selectedElementId={selectedElementId}
            onUpdateTemplate={handleUpdateTemplate}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onUploadBackground={handleUploadBackground}
            onAddTextElement={handleAddTextElement}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
