import { redirect } from 'next/navigation';

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Redirect to visual editor with template ID
  redirect(`/templates/new?id=${id}`);
}
