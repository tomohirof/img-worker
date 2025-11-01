import { redirect } from 'next/navigation';

export default function テンプレートDetailPage({ params }: { params: { id: string } }) {
  // 詳細表示は編集画面にリダイレクト
  redirect(`/templates/${params.id}/edit`);
}
