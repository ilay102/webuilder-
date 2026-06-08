/**
 * app/beauty/page.tsx — Beauty & Cosmetics clinic template preview.
 *
 * Uses BarberTemplate (adapted for cosmetics —
 * cosmetics copy lives in beauty/content.json: tagline, services, testimonials).
 * Shares the same photos from public/pool/salon/ (aesthetic / beauty themed).
 */
import BarberTemplate from '@/components/BarberTemplate';
import content        from './content.json';

export default function BeautyTemplatePage() {
  return <BarberTemplate content={content as any} />;
}
