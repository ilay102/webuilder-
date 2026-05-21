/**
 * app/salon/page.tsx — Women's hair salon template preview.
 *
 * Uses BarberTemplate (the Hebrew section labels are gender-neutral —
 * gendered copy lives in salon/content.json: tagline, services, testimonials).
 * Sharing one component keeps the styling system in lock-step; the pool
 * folder (public/pool/salon/) holds salon-specific photos.
 */
import BarberTemplate from '@/components/BarberTemplate';
import content        from './content.json';

export default function SalonTemplatePage() {
  return <BarberTemplate content={content as any} />;
}
