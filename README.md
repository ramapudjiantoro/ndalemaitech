# Ndalem AI Tech — Website (Frontend Design, V1.0 MVP)

Static HTML + Tailwind CSS frontend for the Ndalem AI Tech company website, built from
`PRD_Website_NdalemAITech_docx.md`. This is the **V1.0 MVP scope**: the three P0 pages plus a
custom 404, designed as a self-contained, instantly-viewable reference that ports cleanly to the
PRD's recommended production stack (Next.js + Tailwind).

## Pages

| File            | Route        | PRD section |
|-----------------|--------------|-------------|
| `beranda.html`  | `/`          | §8.1 Homepage — hero, problem, solution, social proof, how-it-works, final CTA |
| `portfolio.html`| `/portfolio` | §8.3 Case study: Ndalem Pleret (6-part format) |
| `kontak.html`   | `/kontak`    | §8.6 Contact — WhatsApp CTA + 5-field inquiry form |
| `404.html`      | `/404`       | §6.1 Custom on-brand error page |

## How to view

No build step. Open `beranda.html` in a browser, or serve the folder:

```powershell
python -m http.server 8000
# then open http://localhost:8000
```

(Tailwind runs via the Play CDN for this design reference. For production, install Tailwind as a
build dependency so unused classes are purged — see "Productionizing" below.)

## Design system (per PRD §11)

- **Colors** — Navy `#1A3C5E` (brand), Blue `#2E75B6` (CTA/accent), `#F8FAFC` / `#EBF4FB`
  backgrounds, `#38A169` success, `#D69E2E` note. Defined as CSS vars in `assets/css/styles.css`
  and mirrored in each page's inline `tailwind.config`.
- **Type** — Poppins (display/headings) + Lora (body). Loaded from Google Fonts.
- **Principles** — Clarity over cleverness, trust-first, mobile-first, conversion-focused,
  performance-conscious. (Heavy effects like glassmorphism were deliberately avoided — they
  conflict with the PRD's audience and performance targets.)

## What's implemented

- Sticky header + mobile hamburger menu (FR-01–FR-05)
- Floating WhatsApp button with pre-filled message on every page (FR-06, FR-07)
- Contact form with client-side validation, honeypot anti-spam, success state (FR-09–FR-11)
- Responsive at 375 / 768 / 1024 / 1440px, 44px+ touch targets, no horizontal scroll
- Accessibility: skip link, visible focus rings, ARIA labels, semantic headings, `prefers-reduced-motion`
- SEO: unique title/description, Open Graph, canonical, `robots.txt`, `sitemap.xml`,
  JSON-LD (`ProfessionalService`)

## TODO before launch (content + wiring)

Replace the diagonally-striped **placeholder zones** with real assets, and wire the backend:

- [ ] Ndalem Pleret screenshots: homepage, kamar, booking form, admin dashboard (WebP, < 200 KB)
- [ ] Property + founder photos
- [ ] Real logo (swap the temporary "N" mark in header/footer)
- [ ] Confirm business email (currently placeholder `halo@ndalemaitech.id`)
- [ ] Wire the inquiry form to a backend (Formspree / EmailJS / API route) — currently the submit
      handler in `assets/js/main.js` only simulates success client-side
- [ ] Add real outcome metrics to the Portfolio "Hasil Nyata" section once data exists

WhatsApp number used throughout: **6282135222635** (per PRD §13.1).

## Productionizing (PRD §12)

Port to Next.js + Tailwind: move shared header/footer/WhatsApp button into components, install
Tailwind via npm (drop the CDN + inline config), use `next/image` for the screenshots, and deploy
to the VPS Hostinger + Coolify setup (Vercel as fallback).
