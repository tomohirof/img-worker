import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Redirect to visual editor with template ID
  redirect(`/templates/new?id=${id}`);
}
