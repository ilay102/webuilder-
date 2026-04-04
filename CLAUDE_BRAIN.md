# 🧠 Claude's Brain — Web Builder Project

> If the chat resets, read this first. Everything I know about this project lives here.

---

## 🏗️ What We're Building

A collection of **premium marketing website templates** for B2B sales (Chad — Ilay's sales agent).
Each template targets a different industry. Swap name/city/phone → deploy to client.

### Templates Built So Far:
| Route | Industry | Status | Key Photos |
|-------|----------|--------|------------|
| `/realestate` | Luxury Real Estate | ✅ Done | re-exterior, re-interior, re-loft, re-agent |
| `/lawyer` | Law Firm | ✅ Done | lawyer-portrait, lawyer-handshake |
| `/hightech` | High-Tech / SaaS | ✅ Done | ht-dashboard, ht-team |
| `/dental` | Dental Clinic | ✅ Done | dental-hero, dental-reception, dental-smile, dental-consult |
| `/accountant` | Accounting Firm | ✅ Done | acc-hero, acc-portrait, acc-team, acc-data |
| `/barber` | Barbershop | ⏳ Not Started | — |
| `/restaurant` | Restaurant | ⏳ Not Started | — |
| `/finance` | Finance/Wealth | ⏳ Not Started | — |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 App Router (`'use client'` on all pages)
- **Language:** TypeScript
- **Styling:** 100% inline styles (no Tailwind on template pages)
- **Animation:** `framer-motion` — `motion.div`, `useInView`, `whileInView`
- **Fonts:** Google Fonts via `dangerouslySetInnerHTML` in `<style>` tag (NOT `<style>{...}</style>` — causes hydration error)
- **Images:** All in `/public` folder, referenced as `/filename.png`
- **Dev server:** Usually runs on `localhost:3002`

---

## 🎨 How I Build Each Site

### Step 1 — Design Direction
Read the Stitch zip file (if provided) to get the design system spec.
Key file inside: `DESIGN.md` — describes colors, typography, component rules.

### Step 2 — Get Photos
Give Ilay Gemini prompts. He generates and drops them in `/public`.
I then `Read` each file to visually identify them, then `cp` to clean names like `dental-hero.png`.

### Step 3 — Design Tokens
Every page starts with a `const C = {}` and `const F = {}` block:
```ts
const C = {
  bg: '#F5F0E8',        // page background
  white: '#FDFBF7',     // card surfaces
  charcoal: '#1A1A1A',  // headlines
  gold: '#C9A84C',      // accent/CTA
  muted: '#8A7F72',     // body text
} as const;

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  body:  "'Inter', system-ui, sans-serif",
  label: "'Space Grotesk', monospace",
} as const;
```

### Step 4 — Page Structure
Every page follows this section order:
1. **NAV** — fixed, transparent → blur on scroll
2. **HERO** — full viewport height, photo + gradient overlay + headline + 2 CTAs
3. **STATS BAR** — 4 key numbers in a horizontal strip
4. **SERVICES** — main offering section (grid or numbered rows)
5. **ABOUT/SPLIT** — photo left + text right (or vice versa), floating badge
6. **PHOTO BREAK** — full-width image with overlaid quote/card
7. **TESTIMONIALS** — 3 cards
8. **CTA SECTION** — dark background, bold call to action
9. **FOOTER** — 4 columns, dark

### Step 5 — Scroll Fix
Root layout has `h-screen overflow-hidden`. Every page must override this in `useEffect`:
```ts
useEffect(() => {
  document.body.style.height = 'auto';
  document.body.style.overflow = 'auto';
  document.documentElement.style.height = 'auto';
  document.documentElement.style.overflow = 'auto';
}, []);
```

---

## 🎨 Design Systems by Industry

### Real Estate — "Dark Luxury"
- **Palette:** `#131313` bg, `#e6c364` gold, `#e5e2e1` white
- **Fonts:** Newsreader (serif/italic) + Inter + Space Grotesk
- **Feel:** Dark, moody, high-end broker

### Lawyer — "Dark Editorial"
- **Palette:** Same dark as real estate
- **Fonts:** Newsreader italic for headlines, Inter body
- **Feel:** Serious, powerful, prestigious
- **Special:** Hero font `clamp(38px, 5.5vw, 68px)`, paddingTop 40, marginTop -24 on content

### High-Tech — "Terminal Noir"
- **Palette:** `#0e0e0e` bg, `#00dddd` cyan, `#ffabf3` pink
- **Fonts:** Space Grotesk + JetBrains Mono
- **Feel:** Hacker/SaaS, dark, techy
- **Special:** Spline 3D robot hero, HUD corner brackets via CSS `::before/::after`, scanlines overlay
- **Spline URL:** `https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode`
- **Performance:** NO `backdropFilter` except nav, use `willChange: 'transform'` on Spline container

### Dental — "Restorative Sanctuary"
- **Palette:** `#FAF8F4` bg, `#2D6B55` forest green, `#C9956A` oak, `#C8DDD0` sage light
- **Fonts:** Plus Jakarta Sans + Manrope
- **Feel:** Spa + clinic, warm, natural, boutique
- **Stitch file:** `stitch_calm_patient_portal.zip` → `linen_teal/DESIGN.md`

### Accountant — "Private Wealth"
- **Palette:** `#F5F0E8` bg, `#1A1A1A` charcoal, `#C9A84C` gold, `#8A7F72` muted
- **Fonts:** Cormorant Garamond (serif/italic) + Inter + Space Grotesk
- **Feel:** Private bank, old money, boutique firm
- **Special:** Numbered service rows (01-06), italic serif headlines, 0px border-radius on buttons

---

## ⚠️ Common Issues & Fixes

### Hydration Error (Text content does not match)
**Cause:** `<style>{`...`}</style>` — React encodes quotes differently server vs client
**Fix:** Always use `dangerouslySetInnerHTML`:
```tsx
<style dangerouslySetInnerHTML={{ __html: `
  @import url('...');
` }} />
```

### Can't Scroll Down
**Cause:** Root `layout.tsx` has `h-screen overflow-hidden`
**Fix:** `useEffect` scroll override (see Step 5 above)

### Fonts Not Loading / Showing as Text (Material Symbols)
**Cause:** Missing Google Font link in layout
**Fix:** Add to `layout.tsx` or use `dangerouslySetInnerHTML` style tag in page

### Hero Content Too Close to Nav
**Fix:** Adjust `paddingTop` on hero content wrapper. Lawyer is at `40`, hightech at `16`.

### Spline Lag / Performance
**Fix:** Remove all `backdropFilter: blur()`, add `willChange: 'transform'` to Spline container

### Photo Not Found
**Fix:** Check `/public` — photos are sometimes named in Hebrew (Windows screenshots).
Use `Read` tool to visually ID them, then `cp` to clean English names.

---

## 📁 File Structure

```
/app
  /realestate/page.tsx
  /lawyer/page.tsx
  /hightech/
    layout.tsx          ← loads Space Grotesk, JetBrains Mono, Material Symbols
    page.tsx
  /dental/page.tsx
  /accountant/page.tsx
  layout.tsx            ← ROOT — has h-screen overflow-hidden (don't touch)

/components/ui/
  splite.tsx            ← Spline 3D lazy loader
  spotlight.tsx         ← SVG spotlight for hightech
  card.tsx              ← shadcn Card
  expand-map.tsx        ← LocationMap used in lawyer

/public/
  lawyer-portrait.png
  lawyer-handshake.png
  ht-dashboard.png
  ht-team.png
  dental-hero.png       ← treatment room
  dental-reception.png  ← Aurora lobby
  dental-smile.png      ← woman portrait
  dental-consult.png    ← doctor + patient
  acc-hero.png          ← TLV office golden hour
  acc-portrait.png      ← accountant man
  acc-team.png          ← 3-person meeting
  acc-data.png          ← leather portfolio + charts
```

---

## 💡 Tips & Best Practices

1. **Always use `clamp()` for hero fonts** — `clamp(38px, 5.5vw, 68px)` prevents overflow on small screens

2. **Gradient overlays on hero photos:**
   - Left-facing text → `linear-gradient(to right, rgba(bg,0.95) 42%, rgba(bg,0.1) 100%)`
   - Bottom fade → `linear-gradient(to bottom, transparent, bg)` at 120px height

3. **Floating badges on photos** work well as social proof — position `absolute`, `bottom: -24, right: -24` or `left: -28`

4. **Hover states** — always use `useState(hovered)` + `onMouseEnter/Leave` for inline style hover effects (Tailwind hover doesn't work with inline styles)

5. **`useInView` from framer-motion** — wrap with `ref` for scroll-triggered animations: `whileInView={{ opacity: 1, y: 0 }}` + `viewport={{ once: true }}`

6. **Section IDs** — always add `id="services"`, `id="about"`, `id="testimonials"` for nav anchor links

7. **Photo naming convention:** `[industry]-[role].png` — e.g., `dental-hero.png`, `acc-team.png`

8. **Gemini photo prompts** — key phrases that improve quality:
   - "Editorial magazine style — NOT stock photo"
   - "Shot on 85mm, shallow depth of field"
   - "Warm natural light from the left"
   - "Think AD Magazine / Wallpaper* / Vogue"

9. **Colors pulled from photos** — always match the site palette to the actual photo tones. Cohesion > theory.

10. **0px border-radius** = serious/corporate (accountant, lawyer). **99px radius** = friendly/modern (dental, hightech).

---

## 🔄 Workflow with Ilay

1. Ilay picks industry
2. I suggest color palette + vibe
3. I give Gemini photo prompts (4 photos per site)
4. Ilay generates in Gemini → drops in `/public`
5. I `Read` each to visually ID → `cp` to clean names
6. I build the full page in one shot
7. Ilay checks → we iterate spacing/colors
8. Move to next template

---

## 🚀 Next Steps (as of April 2026)

- [ ] Barber / Station template (need stitch zip + photos)
- [ ] Restaurant template
- [ ] Finance / Wealth Management template
- [ ] Python name-swap script: replace clinic name, city, phone → deploy to Vercel
- [ ] Chad integration: auto-select template + deploy for each lead

---

*Last updated: April 2026 — by Claude (Anthropic)*
