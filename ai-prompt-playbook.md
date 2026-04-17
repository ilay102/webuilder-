# AI Image Prompt Playbook — Webuilder
_The methodology for generating high-converting, non-uncanny dental photography via Flux / DALL-E / Midjourney._

---

## PROJECT-SPECIFIC RULES (Non-Negotiable)

These override any general photography instinct. Bake them into every prompt:

1. **BACKGROUND MUST BE: dental clinic OR clean white studio.** No moody editorial bokeh. No charcoal beauty-campaign backgrounds. Either the subject is clearly IN a dental environment, or on a clean white testimonial-style backdrop. This grounds the testimonial as authentic dental-patient content.

2. **SMILES MUST BE OPEN-MOUTH with teeth visible.** No closed-lip smiles. No quiet smiles. No "mysterious" smiles. Full genuine Duchenne smile with teeth showing. If the seed produces closed-mouth, reject immediately — do not try to salvage.

3. **AGE RANGE: 24–30 maximum.** 26 is the sweet spot. AI drifts older by default, so put `thirties-plus, middle-aged, forty, fifty, mature` in the negative prompt explicitly.

4. **ETHNIC VARIETY = AUTHENTICITY for Israeli market.** Rotate across: Mediterranean Israeli, Ashkenazi, Yemenite, Ethiopian-Israeli, Russian-Israeli, Mizrahi. Generic Northern European defaults kill local feel.

5. **NO RECOGNIZABLE FACES IN HERO PHOTOS.** Environment only. Faces belong in testimonial/results photos, never in hero shots — collision risk across clinics.

---

## THE WINNING FORMULA (What Actually Moves the Needle)

### Camera Spec Triplet (Always Include)
Name-brand body + specific lens + specific aperture, e.g.:
- `Hasselblad X2D 100C, XCD 90mm f/2.5 lens at f/2.8` (portraits)
- `iPhone 15 Pro Max main 48MP camera ProRAW` (authentic hero)
- `Sony A7 IV with 35mm f/1.8 at f/4.5` (clinical/clean hero)

Why: specific gear pulls training data from real photography, not stock/CGI.

### Lighting with Kelvin Values
Never say "warm lighting." Always: `3200K tungsten` / `4500K daylight` / `5600K overcast` / `6000K cool daylight`. Plus angle (`45 degrees camera-left`), modifier (`large softbox`, `unmodified window`), and EV (`-0.3 EV for mood` / `+0.2 EV high-key`).

Why: AI models are trained on EXIF-tagged photography data. Kelvin values trigger accurate color temperature rendering.

### Film Emulation Tag
Always end with a film stock: `Kodak Portra 400 emulation, subtle grain`. Portra is the magic word — it pulls from editorial/documentary data, not beauty-ad data.

### The Duchenne Clause (Teeth/Smile Magic)
Exact phrase that works: `authentic Duchenne smile with pronounced natural eye crinkles`. Without it, AI produces mouth-smiles with dead eyes — the #1 uncanny signal.

### The Counterintuitive Teeth Trick
Say `naturally healthy teeth, warm ivory shade NOT bleached-white`. The word "perfect" triggers stock-dental-ad training data and produces uncanny piano-key teeth. "Naturally healthy" pulls from documentary/editorial data.

### The Skin Authenticity Clause
Always include: `visible natural skin texture with pores, matte realistic finish, single tiny natural imperfection for authenticity, NOT airbrushed NOT smoothed NOT plastic`. This is what kills the wax-figure look.

---

## PROMPT STRUCTURE (Follow This Order)

Every portrait prompt follows this exact structure. Every section is load-bearing.

```
1. SUBJECT IDENTITY
   - Age (max 30)
   - Ethnicity (specific Israeli sub-group)
   - Specific beauty features (eyes, jaw, hair, lips) — tasteful specifics
   - Wardrobe (simple, one accent item)

2. EXPRESSION
   - "BIG GENUINE WARM SMILE showing naturally healthy teeth fully visible"
   - Duchenne eye-crinkle clause
   - Head angle in degrees
   - Eye contact with lens

3. CAMERA
   - Body + lens + aperture + ISO

4. LIGHTING
   - Kelvin value + angle + modifier + fill + catchlight note + EV

5. BACKGROUND
   - EITHER: softly out-of-focus dental clinic interior
   - OR: clean seamless warm-white studio backdrop
   - Explicit "NOT moody bokeh NOT editorial charcoal"

6. SKIN RENDERING
   - Texture, pores, imperfection, matte finish, NOT plastic

7. TEETH RENDERING
   - Naturally healthy, warm ivory, realistic anatomy, NOT neon-white

8. POST
   - Portra 400, grain, contrast curve, aspect ratio, "real human NOT AI"
```

---

## NEGATIVE PROMPT TEMPLATE (Portraits)

Always include every section below. Each addresses a specific AI failure mode.

```
# Face uncanny
AI face, uncanny valley, plastic skin, airbrushed, smoothed skin, 
wax figure, mannequin, CGI, 3D render, doll-like, porcelain skin, 
beauty-filter, FaceTune, over-retouched, perfectly symmetrical face, 
dead eyes, empty stare, glassy eyes, soulless gaze

# Closed mouth (project rule violation)
closed mouth, closed lips, not smiling, serious expression, 
neutral expression, mysterious smile, subtle smile, quiet smile, 
pursed lips, smirk, half-smile, barely smiling

# Teeth uncanny
Hollywood veneers, too-white teeth, piano-key teeth, fake teeth, 
denture look, uniform teeth, oversized teeth, misaligned teeth, 
extra teeth, missing teeth, distorted teeth, teeth merging, 
floating teeth, deformed mouth, duck lips

# Style violation (project rule)
moody dark bokeh, dramatic low-key lighting, editorial charcoal 
background, Vogue moody aesthetic, dark shadows on face

# Age drift
old, aged, wrinkled, middle-aged, thirties-plus, forty, fifty, 
mature, grey hair

# Standard
cartoon, anime, illustration, stock photo, generic model, 
catalog smile, watermark, text, logo, ring light reflection
```

---

## API SETTINGS (Tested, Working)

| Platform | Settings |
|---|---|
| **Flux 1.1 Pro** | `aspect_ratio: "4:5"` (portraits) or `"16:9"` (heroes), `output_quality: 95`, `prompt_upsampling: true` for portraits |
| **DALL-E 3** | `size: "1024x1792"` (portrait) or `"1792x1024"` (landscape), `quality: "hd"`, `style: "natural"` NEVER `vivid` |
| **Midjourney v6.1** | `--ar 4:5 --style raw --stylize 140 --chaos 5 --weird 0` |

**Critical:** Flux `prompt_upsampling: true` is only for portraits. For heroes set `false` — it adds unwanted drama to environment shots.

---

## REJECTION RULES (Zero Tolerance)

Reject immediately, do not try to salvage:
1. Closed mouth / no teeth showing
2. Dead eyes (no Duchenne eye-crinkle)
3. Teeth look like veneers (uniform, too white, merging)
4. Skin looks plastic / airbrushed / smoothed
5. Subject looks older than ~30
6. Background is moody editorial bokeh instead of dental/white
7. Any extra fingers, warped ears, anatomy errors
8. Background plant dominating the frame (hero)
9. Hero reads as spa / salon / wellness / hospital / hair salon

---

## GENERATION VOLUME STRATEGY

**Per-character approach:**
- Generate 4 seeds per portrait prompt (~$0.16 on Flux 1.1 Pro)
- Usually winner is seed #2 or #3, not #1
- Keep a log of winning seeds — siblings (`seed ± 1`) often give clean variants

**Per-hero approach:**
- Generate 4 seeds per hero prompt
- Variance in chair position and light angle is normal; pick the composition that leaves clean negative space on the upper-left third for text

---

## THE "FRESH EYE" TEST (Final Gate)

Before approving any portrait:
- Show it to ONE person who doesn't know it's AI
- Ask: "would you believe this person left a real review for a dental clinic?"
- If they hesitate or say "hmm, something's off" → reject

Your own eye goes blind after staring at AI output for an hour. Fresh eye catches the uncanny signal you stopped seeing.

---

## PROMPT EVOLUTION NOTES

Track what worked and what didn't. Over time, prompt versions should converge toward higher approval rates.

| Version | Date | Approval rate | Notes |
|---|---|---|---|
| v1 | 2026-04-17 | — | Initial formula. First portrait winner: Mediterranean woman, 26, Hasselblad + Portra 400 + Duchenne clause |
| v1 | 2026-04-17 | reject | Closed-lip strategy failed — client prefers open-mouth teeth-showing smiles |
| v2 | 2026-04-17 | — | Added project rules: dental/white bg only, open-mouth only, age ≤30 |

When prompts iterate, tag generated images with prompt version so approval rate can be correlated to prompt changes.

---

_End of playbook. Reference this at the start of every AI image generation session._
