import { redirect } from 'next/navigation';

export default async function テンプレートDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 詳細表示は編集画面にリダイレクト
  redirect(`/templates/${id}/edit`);
}
