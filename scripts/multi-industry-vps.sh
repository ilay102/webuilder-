#!/usr/bin/env bash
# multi-industry-vps.sh — runs on VPS to enable garage + barber pipelines.
#  1. Add Hebrew industry terms to Pen ALLOWED_INDUSTRIES so it drafts cold
#     messages for garages and barbers, not just dentists.
#  2. Rewrite the Sun-Thu cron so each day scouts 3 industries × 1 city.
set -euo pipefail
PEN=/root/hardcoded_pen.js
cp "$PEN" "$PEN.bak.$(date +%s)"

# ── 1: Pen allowlist ──────────────────────────────────────────────────────
node -e "
  const fs = require('fs');
  const p  = '$PEN';
  let s = fs.readFileSync(p, 'utf-8');
  const NEW = \"const ALLOWED_INDUSTRIES = ['רופא שיניים', 'מרפאת שיניים', 'dental', 'מוסך', 'garage', 'פחחות', 'ברבר', 'מספרת גברים', 'מספרה לגברים', 'barber', 'מספרה', 'ספרות', 'סלון יופי', 'סלון שיער', 'מספרה לנשים', 'מעצב שיער', 'מעצבת שיער', 'salon', 'hair'];\";
  s = s.replace(/const ALLOWED_INDUSTRIES = \[[^\]]*\];/, NEW);
  fs.writeFileSync(p, s);
  console.log('[fix] Pen ALLOWED_INDUSTRIES updated (4 industries: dental, garage, barber, salon).');
"
grep -n 'ALLOWED_INDUSTRIES' "$PEN" | head -3

# ── 2: Cron — 3 industries × 1 city each, daily Sun–Thu ───────────────────
( crontab -l 2>/dev/null | grep -vE 'scout-find-lead|hardcoded_pen' || true
  # Dental (3 sends/day from rotating southern + sharon cities)
  echo "0 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'רופא שיניים'  'באר שבע' >> /root/scout.log 2>&1"
  echo "3 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'מרפאת שיניים' 'אשדוד'  >> /root/scout.log 2>&1"
  echo "6 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'רופא שיניים'  'אילת'   >> /root/scout.log 2>&1"
  # Garage
  echo "9 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'מוסך' 'תל אביב' >> /root/scout.log 2>&1"
  echo "12 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'מוסך' 'רמת גן' >> /root/scout.log 2>&1"
  echo "15 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'מוסך' 'באר שבע' >> /root/scout.log 2>&1"
  # Barber (men) — use specific men-targeting queries so industry mapping → 'barber'
  echo "18 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'מספרת גברים' 'תל אביב' >> /root/scout.log 2>&1"
  echo "21 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'ברבר'         'רמת גן'  >> /root/scout.log 2>&1"
  # Salon (women) — use specific women-targeting queries so industry mapping → 'salon'
  echo "24 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'סלון יופי'    'תל אביב' >> /root/scout.log 2>&1"
  echo "27 6 * * 0-4 /usr/bin/node /root/scout-find-lead.js 'מעצב שיער'    'חיפה'    >> /root/scout.log 2>&1"
  # Pen drafts after all scouts
  echo "30 6 * * 0-4 /usr/bin/node /root/hardcoded_pen.js >> /root/pen.log 2>&1"
) | crontab -

echo '--- NEW CRONTAB ---'
crontab -l | grep -E 'scout|pen|webuilder' || crontab -l
echo
echo '✅ Pen + Scout cron now cover 3 industries. Restart pm2 services after deploying simple-jj/server.js.'
