/**
 * app/dental/page.tsx — Canonical template preview.
 *
 * Shows the dental template with content from dental/content.json.
 * Used as the master template reference and for pool-review screenshots.
 * All real client sites now use app/[slug]/page.tsx → DentalTemplate.
 */
import DentalTemplate from '@/components/DentalTemplate';
import content        from './content.json';

export default function DentalTemplatePage() {
  return <DentalTemplate content={content as any} />;
}
