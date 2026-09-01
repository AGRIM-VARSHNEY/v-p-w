# Build Brief: Independent VC Research Portfolio — Agrim Kumar

## What this is
A single-page, scroll-driven storytelling website showcasing three independent
investment research notes (Inamo, Blitz, insideFPV) as a portfolio piece aimed
at getting noticed by junior people at small/young Indian VC funds. This is
NOT a resume site and NOT a generic "portfolio template" — it should read like
a sharp, confident editorial piece that happens to be a portfolio. Rhythm and
pacing matter as much as content.

## Audience & goal
Associates, VPs, and principals at seed/Series-A-focused Indian VC funds
(Antler India, Shastra VC, Gemba Capital, GVFL, AUM Ventures — NOT the
mega-brand funds). Goal: within 30 seconds of landing, a visitor should
understand (1) who Agrim is, (2) the one sharp thesis connecting all three
notes, and (3) that the underlying work is real, sourced, and self-critical —
not AI-generated fluff. The site's job is to get one of the three notes opened.

## Non-negotiables
- Single scrolling page, not multi-page nav. Section anchors for jump-links only.
- Mobile-first responsive. Test at 375px width minimum.
- Real content only — no placeholder lorem ipsum, no fake stats. Everything
  below is real and sourced; use it verbatim or tightly edited, never invented.
- Fast: no heavy unoptimized images, no blocking web fonts without fallback.
- Accessible: semantic HTML, proper heading hierarchy, sufficient contrast,
  keyboard-navigable.
- Do NOT use the three cliché "AI-generated site" patterns: (a) cream/beige +
  orange gradient hero, (b) generic SaaS-landing-page layout with 3 icon cards
  in a row, (c) purple-to-blue gradient buttons. Design direction is below.

## Visual identity — carry over from the existing research notes
The three PDFs already have a consistent, distinctive visual system. Reuse it
so the site and the notes feel like one coherent body of work:
- Colors: deep teal/pine (#0E2A2C primary dark), warm gold/ochre accent
  (#B8863B), muted brick-red signal color (#9A3B3B) for emphasis/tension
  points, warm paper off-white background (#EDEEE3) — NOT pure white, NOT
  cream-orange.
- Type: a serif display face with editorial character (Fraunces, or similar)
  for headlines; a clean grotesk (IBM Plex Sans or similar) for body text;
  a monospace (IBM Plex Mono) for stats, labels, and section eyebrows —
  gives it a "working memo" / ledger feel rather than a generic startup site.
- Motifs available to reuse: the "iceberg" diagram concept (visible vs.
  submerged) and the pyramid/dot-grid diagram concept from the Inamo note
  could inspire a subtle recurring graphic motif (e.g., a thin dot-grid
  texture, or an underline/reveal animation) — don't force it, use only if
  it strengthens rather than clutters.

## Storytelling rhythm — the actual structure
This should NOT feel like three equal boxes in a grid. Build it as a
narrative with pacing: short/punchy → building → deep → resolving.

### 1. Hero (short, punchy, ~5 seconds to read)
Full-viewport-height opener. Minimal. One big serif headline, one short
sub-line, one scroll-cue. No nav bar clutter.

Headline: **"Three companies. Three sectors. One bet."**
Subhead: *Independent investment research on the small, young funds who
write the first cheque — before the brand names show up as follow-on
capital.*
Byline: `AGRIM KUMAR — INDEPENDENT RESEARCH — 2026`
Scroll cue: small animated down-arrow or "scroll" label.

### 2. The Thesis (short — this is the throughline, make it land)
A single, confident paragraph, large type, generous whitespace around it —
should feel like a pull-quote, not a paragraph of body text.

> "Across quick-commerce infrastructure, brand-direct logistics, and
> indigenous defense manufacturing, the same pattern keeps showing up: a
> small, specialist fund gets there first — Shastra VC and Antler India at
> Inamo's seed, India Quotient at Blitz's — and by the time a brand-name fund
> shows interest, they're arriving as follow-on capital, not the lead. This
> is research built to find that window before it closes."

Below it, three small mono-tagged stat chips (not full cards yet — just a
teaser row): `₹110 Cr — sourced from regulatory filings` /
`$600K → acquired in 3 years` / `₹10 Cr contract, 2 months`

### 3. Three chapters — one per company, each its own full-width section
Each chapter should have a DIFFERENT pacing/rhythm to avoid monotony —
vary the layout pattern between the three (e.g., text-left/visual-right,
then full-width stat band, then text-right/visual-left). Each chapter needs:
- A chapter number/eyebrow label (mono font): `CHAPTER ONE — QUICK COMMERCE`
- A one-line hook (the single sharpest insight, not a summary)
- 2–3 pull-out stats in large serif numerals
- A short paragraph (3–4 sentences max) — teaser, not the full memo
- A clear CTA: "Read the full investment note →" linking to the PDF, plus
  smaller links to the two supporting workbooks (xlsx)
- Do NOT paste full memo text into the site. The site sells the note; the
  note is the depth.

**Chapter One — Inamo (quick-commerce infrastructure)**
Eyebrow: `CHAPTER ONE — UNDERNEATH THE TEN-MINUTE WAR`
Hook: *"Blinkit, Zepto, and Instamart are fighting a war no small fund can
buy into. The infrastructure being built to fight it is a different story."*
Stats to pull: `₹110 Cr pre-money — sourced from regulatory filings, not
estimated` / `Series A led by Prime Venture Partners — not a mega-fund` /
`6,000+ dark stores, 2,000–2,500 more opening in 2026 alone`
Body: Inamo builds dark-store infrastructure for quick-commerce platforms —
not the platforms themselves. The Series A valuation came from Inc42's own
reporting on Inamo's regulatory filings, not an estimate. The note models
deal mechanics, bear/base/bull return scenarios, founder diligence, and a
live gig-worker regulatory exposure most research on this space ignores.
CTA: `Read the full note (PDF)` / `Competitive analysis (xlsx)` /
`Traction analysis (xlsx)`

**Chapter Two — Blitz (brand-direct delivery infrastructure)**
Eyebrow: `CHAPTER TWO — THE REPEAT INVESTOR SIGNAL`
Hook: *"India Quotient led Blitz's seed. Two years later, they came back —
this time as a follow-on investor behind a smaller fund's lead."*
Stats to pull: `IvyCap Ventures led the Series A — India Quotient followed`
/ `40% disclosed reduction in return-to-origin rates` / `172 employees,
+28% YoY — a real, verifiable scale signal`
Body: Blitz sells fast, brand-direct delivery to D2C companies — a
different model from Inamo's platform-facing infrastructure. The note is
deliberately honest about what's unverified: no disclosed valuation, and an
open question about a co-founder's prior venture that the note flags rather
than glosses over.
CTA: same three-link pattern.

**Chapter Three — insideFPV (indigenous defense manufacturing)**
Eyebrow: `CHAPTER THREE — REAL CONTRACTS, NOT PROJECTIONS`
Hook: *"Founded the year of the Galwan clash. Five years later, still
bootstrapped. Then: 100 combat drones delivered to the Army in 60 days."*
Stats to pull: `₹10 Cr Ministry of Defence contract — completed in 2
months` / `Comparable exit: $600K seed → acquired within 3 years
(Sharang Shakti / LAT Aerospace)` / `Pre-Series A led by GVFL — a
35-year-old regional fund, not a brand name`
Body: insideFPV is the only one of the three with real, executed government
revenue rather than projected traction — and the only one carrying genuine
defense-sector regulatory exposure (FDI limits, export control) that the
note treats as an open diligence question, not a footnote.
CTA: same three-link pattern.

### 4. How this is built (methodology — short, confident, not defensive)
A compact section, mono/serif mix, maybe styled like a "ledger" or
checklist. This section is what separates the portfolio from a generic
"look at my research" page — it shows the discipline.

Headline: **"Every number here is tagged, not just stated."**
Four short items, icon-free, text-led:
- *Confidence-rated sourcing* — every figure marked HIGH / MEDIUM / LOW,
  not presented with false uniform authority.
- *Deal mechanics and return math* — bear/base/bull scenarios with stated
  assumptions, not just a market-sizing slide.
- *A dissent case in every note* — the strongest argument against investing,
  written by the same person arguing for it.
- *Gaps are named, not hidden* — when a valuation or a founder's track
  record couldn't be verified, the note says so directly.

### 5. About (short — one paragraph, not a resume)
Headline: **"Who's writing this."**
One paragraph: Agrim Kumar — Program Manager / Founder's Office Associate at
VisitHealth, building this research independently, not as a live pitch or
a job application, as a demonstration of how he thinks about a market and
a company before ever making a call. Applying Fall 2027 to MS Finance/
Management programs. Open to feedback from anyone closer to these deals
than he is.

### 6. Get in touch (closing CTA — low-pressure, explicit about intent)
Headline: **"If you know something these notes got wrong, I want to hear it."**
Short line reinforcing framing: *not a pitch, not a job application — an
open invitation to tell me where the judgment is off.*
Contact method: email / LinkedIn link (placeholder — insert actual details).
Small closing line, mono font, quiet: `Confidential drafts. Not yet invested.
Independent research only.`

## Interaction / motion direction
- Scroll-triggered fade/slide-up reveals on each section (subtle, ~400-600ms,
  don't overdo it — one reveal style used consistently beats five different
  animation types).
- The stat numerals in each chapter can count up or simply fade in when
  scrolled into view — pick one, keep it consistent.
- Smooth-scroll for anchor nav if a minimal sticky nav is used (optional —
  a bare scroll-cue in the hero may be enough without permanent nav chrome).
- No parallax gimmicks, no autoplaying video/audio.

## Tech notes for Claude Code
- Plain HTML/CSS/JS is fine and probably preferable for a single scrolling
  page — no need for a heavy framework unless the person building this
  wants component reuse. If a framework is used, Next.js (static export) is
  a reasonable default.
- Fonts: Google Fonts (Fraunces, IBM Plex Sans, IBM Plex Mono) via standard
  `<link>` tags.
- The three PDFs and four xlsx files should be linked as static downloadable
  assets — build the page assuming files live in a `/documents/` folder
  named `inamo-note.pdf`, `inamo-competitive.xlsx`, `inamo-traction.xlsx`,
  `blitz-note.pdf`, `blitz-competitive.xlsx`, `blitz-traction.xlsx`,
  `insidefpv-note.pdf`, `insidefpv-competitive.xlsx`, `insidefpv-traction.xlsx`
  — rename the actual files to match before deploying, or adjust the hrefs.
- Deploy target: any static host (Vercel, Netlify, GitHub Pages) — keep the
  build framework-agnostic enough that this isn't a constraint.

## Tone check for whoever builds this
If any section starts to read like a generic startup landing page ("Welcome
to my portfolio! I'm passionate about venture capital..."), cut it. Every
line should sound like it was written by someone confident enough to publish
a dissent case against their own thesis — dry, sharp, a little understated,
never salesy.
