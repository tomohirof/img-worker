import { AdminLayout } from '@/components/layout/AdminLayout';
import { PictureInPicture2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground mt-1">システムの概要と統計情報</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-blue-100 p-2">
              <PictureInPicture2 className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">総テンプレート数</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
