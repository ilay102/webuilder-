import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import { IntakeForm } from './IntakeForm';

const VPS = process.env.NEXT_PUBLIC_API_URL || 'http://204.168.207.116:3000';

/**
 * Intake page for a client slug.
 *
 * Slug resolution (first match wins):
 *   1. VPS  GET /api/clients/:slug   — primary, used by all new demos
 *   2. Disk app/{slug}/content.json  — legacy per-folder clients
 *
 * The SERVICES list always comes from the canonical dental template so test
 * data can never leak into a real client's offering. Biz fields start empty
 * — the client fills their own real info.
 */
export default async function IntakePage({ params }: { params: { slug: string } }) {
  // 1. VPS check (covers all demos created via /api/demo/create or new-demo.ts)
  let provisioned = false;
  try {
    const res = await fetch(`${VPS}/api/clients/${params.slug}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      provisioned = !!(data && data.slug === params.slug);
    }
  } catch { /* VPS unreachable — fall back to disk */ }

  // 2. Disk fallback for legacy folder-based clients
  if (!provisioned) {
    const clientPath = path.join(process.cwd(), 'app', params.slug, 'content.json');
    try {
      await readFile(clientPath, 'utf-8');
      provisioned = true;
    } catch { /* not on disk either */ }
  }

  if (!provisioned) notFound();

  // Always load services from the canonical template
  let templateServices: Array<{ icon: string; title: string; desc: string }> = [];
  try {
    const templatePath = path.join(process.cwd(), 'app', 'dental', 'content.json');
    const tmpl = JSON.parse(await readFile(templatePath, 'utf-8'));
    templateServices = tmpl.services ?? [];
  } catch {
    // Fallback to hardcoded defaults if template file is missing
    templateServices = [
      { icon: '✦', title: 'אסתטיקת שיניים', desc: 'ציפויים, הלבנה ועיצוב חיוך — מותאמים בדיוק ליופי הטבעי שלך.' },
      { icon: '◈', title: 'שתלי שיניים',    desc: 'שתלי טיטניום שמרגישים ונראים כמו שן טבעית. תוצאות לכל החיים.' },
      { icon: '◉', title: 'יישור שיניים',   desc: 'מיישרים שקופים ומסילות בלתי נראות — יישרי את החיוך בדיסקרטיות.' },
      { icon: '○', title: 'טיפול שורש',     desc: 'טיפול שורש ללא כאב, מדויק ומונחה דיגיטלית לאורך כל הדרך.' },
    ];
  }

  // Always pass empty biz data — client fills in their own real details
  const initial = {
    biz: {
      name: '', tagline: '', phone: '', city: '',
      address: '', email: '', hours: '', alertWhatsapp: '',
    },
    services: templateServices,
  };

  return <IntakeForm slug={params.slug} initial={initial} />;
}
