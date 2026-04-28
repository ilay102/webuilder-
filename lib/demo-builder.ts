/**
 * demo-builder.ts — Pure factory for siteContent.
 *
 * Single source of truth for assembling a client's siteContent JSON from:
 *   1. intake/biz fields
 *   2. design pack
 *   3. text pack
 *   4. image pool allocations (hero + patient)
 *
 * Used by:
 *   - scripts/new-demo.ts            (CLI)
 *   - scripts/restore-demo.ts         (recovery)
 *   - app/api/demo/create/route.ts    (Mission Control button)
 *
 * NEVER inherits from any per-client file. The whole point is isolation:
 * two demos created the same second must produce siteContents that share
 * NOTHING except the design/text packs they were dealt.
 */

import type { SiteContent } from '@/components/DentalTemplate';
import type { PoolImage }    from './pool-manager';
import type { TextPack }     from './text-packs';

export interface BizFields {
  name:            string;
  city:            string;
  phone:           string;
  hours:           string;
  clientEmail:     string;
  clientWhatsapp:  string;
  tagline?:        string;
  calLink?:        string;
  domain?:         string | null;
  template?:       string;
  address?:        string;
}

export function composeSiteContent(args: {
  biz:      BizFields;
  hero:     PoolImage;
  patient:  PoolImage;
  textPack: TextPack;
  designPackId: string;
}): SiteContent {
  const { biz, hero, patient, textPack, designPackId } = args;

  return {
    biz: {
      name:          biz.name,
      tagline:       textPack.copy.tagline,
      city:          biz.city,
      address:       biz.address ?? biz.city,
      phone:         biz.phone,
      email:         biz.clientEmail,
      hours:         biz.hours,
      calLink:       biz.calLink ?? 'ilay-lankin/15min',
      alertEmail:    biz.clientEmail,
      alertWhatsapp: biz.clientWhatsapp,
      domain:        biz.domain ?? null,
      template:      biz.template ?? 'dental',
    },
    services:     textPack.services,
    testimonials: textPack.testimonials,
    stats:        textPack.stats,
    photos: {
      hero:    hero.path,
      about:   hero.path,
      results: patient.path,
      cta:     hero.path,
      gallery: [],
    },
    design: { packId: designPackId, textPackId: textPack.id },
    copy:   textPack.copy,
  };
}
