import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import { IntakeForm } from './IntakeForm';

/**
 * Intake page for a client slug.
 *
 * Architecture decision:
 * - We verify the slug exists (client has been provisioned) by checking content.json.
 * - The SERVICES offered on the form always come from the canonical dental TEMPLATE
 *   (app/dental/content.json), NOT from the client's own content.json.
 *   This prevents testing from corrupting the service list shown to real clients.
 * - Business fields (name, phone, etc.) always start EMPTY — the client fills in
 *   their own real info, not whatever template defaults exist in content.json.
 */
export default async function IntakePage({ params }: { params: { slug: string } }) {
  // Verify client is provisioned
  const clientPath = path.join(process.cwd(), 'app', params.slug, 'content.json');
  try {
    await readFile(clientPath, 'utf-8');
  } catch {
    notFound();
  }

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
