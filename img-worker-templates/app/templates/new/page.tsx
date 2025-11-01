'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Canvas } from '@/components/editor/Canvas';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { Toolbar } from '@/components/editor/Toolbar';
import { api, Template, TextElement } from '@/lib/api';

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');

  const [template, setTemplate] = useState<Template>({
    id: '',
    name: '',
    width: 1200,
    height: 630,
    background: { type: 'color', value: '#1e40ff' },
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

      // Remove id, createdAt, updatedAt from payload
      const { id, createdAt, updatedAt, ...payload } = template;

      if (templateId) {
        // Update existing template
        await api.updateTemplate(templateId, payload);
        alert('テンプレートを更新しました！');
      } else {
        // Create new template
        await api.createTemplate(payload);
        alert('テンプレートを作成しました！');
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
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar
        templateName={template.name}
        onAddTextElement={handleAddTextElement}
        onPreview={handlePreview}
        onSave={handleSave}
        isSaving={isSaving}
      />
      <div className="flex-1 flex overflow-hidden">
        <Canvas
          template={template}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onUpdateElement={handleUpdateElement}
        />
        <PropertiesPanel
          template={template}
          selectedElementId={selectedElementId}
          onUpdateTemplate={handleUpdateTemplate}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onUploadBackground={handleUploadBackground}
        />
      </div>
    </div>
  );
}
