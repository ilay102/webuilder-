/**
 * app/garage/page.tsx — Canonical garage-template preview.
 *
 * Renders the GarageTemplate with content from garage/content.json.
 * Used as template reference and for pool-review screenshots.
 */
import GarageTemplate from '@/components/GarageTemplate';
import content        from './content.json';

export default function GarageTemplatePage() {
  return <GarageTemplate content={content as any} />;
}
