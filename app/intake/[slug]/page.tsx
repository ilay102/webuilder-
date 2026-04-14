import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import { IntakeForm } from './IntakeForm';

export default async function IntakePage({ params }: { params: { slug: string } }) {
  const contentPath = path.join(process.cwd(), 'app', params.slug, 'content.json');
  let content: any;
  try {
    content = JSON.parse(await readFile(contentPath, 'utf-8'));
  } catch {
    notFound();
  }
  return <IntakeForm slug={params.slug} initial={content} />;
}
