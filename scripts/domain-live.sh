#!/bin/bash
# domain-live.sh — Run this on the VPS after you've configured a custom domain.
#
# Usage:  /root/simple-jj/domain-live.sh <slug> <domain>
# Example: /root/simple-jj/domain-live.sh marpaat-shinayim-demo marpaat-shinayim.co.il
#
# What it does:
#   1. PATCHes the client record on the VPS with the new domain
#   2. Sends the client a WhatsApp telling them their site is live
#   3. Sends a follow-up WhatsApp pointing them to the GMB guide
#
# Prerequisites (your manual steps before running this):
#   - Domain bought at registrar
#   - DNS A/CNAME records pointing to Vercel (76.76.21.21 / cname.vercel-dns.com)
#   - Domain added to Vercel project (Settings → Domains)
#   - SSL cert provisioned (~5 min after add)
#
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <slug> <domain>"
  echo "Example: $0 marpaat-shinayim-demo marpaat-shinayim.co.il"
  exit 1
fi

SLUG="$1"
DOMAIN="$2"
VPS_API="http://localhost:3000"
JJ_API="http://localhost:3002"
SITE_URL="https://${DOMAIN}"

echo "[domain-live] slug=${SLUG} domain=${DOMAIN}"

# 1. Look up the client's WhatsApp number
echo "[domain-live] fetching client record..."
PHONE=$(curl -s "${VPS_API}/api/clients/${SLUG}" \
  | grep -oE '"(whatsapp|alertWhatsapp|phone)"\s*:\s*"[^"]+"' \
  | head -1 \
  | grep -oE '"[0-9+\-\s]+"' \
  | tr -d '"+\- ' \
  | sed 's/^0/972/')

if [ -z "$PHONE" ]; then
  echo "[domain-live] ERROR: could not extract phone from client record"
  exit 2
fi

echo "[domain-live] client phone: +${PHONE}"

# 2. Update the client record with the live domain
echo "[domain-live] updating client record..."
curl -s -X PATCH "${VPS_API}/api/clients/${SLUG}" \
  -H "Content-Type: application/json" \
  -d "{\"domain\":\"${DOMAIN}\",\"domainStatus\":\"live\",\"domainLiveAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >/dev/null

# 3. Notify the client — site is live
echo "[domain-live] notifying client..."
MSG_LIVE="🎉 *האתר שלך עלה לאוויר!*

הכתובת שלך: ${SITE_URL}

אתה יכול לפתוח את הקישור עכשיו ולראות את האתר. שלח אותו ללקוחות, הוסף ל-WhatsApp, חתימת מייל, ועוד."

curl -s -X POST "${JJ_API}/send-message" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,sys; print(json.dumps({'phone':'${PHONE}','message':'''$MSG_LIVE'''}))")" >/dev/null || \
curl -s -X POST "${JJ_API}/send-message" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${PHONE}\",\"message\":\"🎉 האתר חי בכתובת: ${SITE_URL}\"}" >/dev/null

# 4. Follow up with GMB guide (3 sec later, separate message)
sleep 3
MSG_GMB="📍 *הצעד הבא — גוגל מפות*

עכשיו שיש אתר, מי שיחפש אותך בגוגל ב-Google Maps יכול להוביל אליך לקוחות חדשים. זה הכי משפיע על ההכנסה שלך.

מדריך קצר (10 דקות, חד-פעמי):
${SITE_URL%/*}/gmb

(או: https://webuilder-liart.vercel.app/gmb)

הכי חשוב — בשדה ״אתר אינטרנט״ בפרופיל גוגל מפות תכניס: ${SITE_URL}"

curl -s -X POST "${JJ_API}/send-message" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${PHONE}\",\"message\":\"📍 השלב הבא — להופיע בגוגל מפות. מדריך: https://webuilder-liart.vercel.app/gmb\"}" >/dev/null

echo "[domain-live] ✅ ${DOMAIN} live, client +${PHONE} notified twice"
