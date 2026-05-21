/**
 * app/barber/page.tsx — Canonical barber/salon template preview.
 */
import BarberTemplate from '@/components/BarberTemplate';
import content        from './content.json';

export default function BarberTemplatePage() {
  return <BarberTemplate content={content as any} />;
}
