---
name: web
description: Advanced lead research (Phone + WhatsApp first, Email optional) with Anti-Scraping rules.
metadata:
  {"openclaw": {"emoji": "🔍", "os": ["linux","darwin"]}}
---

# SKILL: Elite B2B Lead Research (WhatsApp Pipeline)

## The Mission
Find Israeli businesses with NO website. Extract their phone number (for WhatsApp).
Email is a bonus — never a requirement.

## The Law of Laziness (Anti-Scraping) - MANDATORY
- Wait between 15 to 45 seconds (randomized) between every `web_search` request.
- Look like a slow human — hacker scripts get blocked, slow humans don't.
- Do NOT exceed 10 qualified leads per day. Hit 10 → write to leads.json → STOP.
- ONE good lead per session is a WIN. Don't keep searching just to find more.

## Primary Search Method — Google Snippets (Never Gets Blocked)
Google search result snippets ALWAYS show phone numbers directly.
You never need to open the business website or any directory.

**Step 1:** Search Google for businesses in a category + city:
```
רואה חשבון ירושלים ללא אתר
מוסך תל אביב טלפון
קבלן שיפוצים חיפה
```

**Step 2:** Read the snippet (the text under the result) — phone is usually there.
Do NOT web_fetch the site. The snippet is enough.

**Step 3:** Check if the business has a website in the snippet.
- If snippet shows a website URL → skip this lead (they already have one)
- If no website visible → this is your lead ✅

## Backup Method — Google Maps Search
If snippets don't show phone numbers, search Google Maps:
```
site:maps.google.com "רואה חשבון" "ירושלים"
```
Maps results always include phone numbers without bot blocking.

## BANNED Methods (Will Get Blocked — Don't Use)
- ❌ web_fetch on easy.co.il (Cloudflare blocks bots)
- ❌ web_fetch on b144.co.il (Cloudflare blocks bots)
- ❌ Crawling business websites for contact pages
- ❌ Scraping any directory site

## Extraction Rules
- **Phone:** Mandatory. If no phone found → discard the lead.
- **Email:** Optional bonus. If found great, if not — that's fine.
- **No Website:** Mandatory. If the business already has a website → discard.
- **Address:** Nice to have. Try to find city at minimum.
- **Notes:** MUST write 1-2 sentences about the business for Pen to personalize the message.
  Example: "מוסך עם ביקורות מצוינות בגוגל, אין אתר, נמצא בחיפה ליד הנמל"

## Output Format (leads.json)
```json
[
  {
    "id": "lead-jerusalem-YYYYMMDD-01",
    "company": "שם העסק",
    "contact": "שם הבעלים (אם נחשף)",
    "phone": "05X-XXXXXXX (mandatory)",
    "email": "business@gmail.com (optional, null if not found)",
    "address": "רחוב ומספר, עיר (nice to have)",
    "industry": "Restaurant/Garage/Accountant/etc",
    "city": "שם העיר",
    "status": "new",
    "score": 85,
    "agent": "Scout",
    "found_at": "ISO timestamp",
    "notes": "תיאור קצר של העסק — Pen ישתמש בזה לכתוב הודעת וואטסאפ מותאמת אישית"
  }
]
```

## Scoring Guide
- Phone found: +40 points
- No website confirmed: +30 points
- Owner name found: +15 points
- Email found: +10 points
- Detailed notes written: +5 points

Score 70+ = save to leads.json. Below 70 = discard and find better lead.
