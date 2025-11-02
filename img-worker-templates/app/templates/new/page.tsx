import { Suspense } from 'react';
import { TemplateEditor } from './TemplateEditor';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function NewTemplatePage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-lg">読み込み中...</div>
          </div>
        </AdminLayout>
      }
    >
      <TemplateEditor />
    </Suspense>
  );
}
