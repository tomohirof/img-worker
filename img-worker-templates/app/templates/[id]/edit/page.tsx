'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditTemplatePage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to visual editor with template ID
    router.push(`/templates/new?id=${params.id}`);
  }, [params.id, router]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-lg">リダイレクト中...</div>
    </div>
  );
}
