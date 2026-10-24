# เที่ยวไทย — Cinematic Thailand Travel Landing

A Vite + React + TypeScript travel homepage with a scroll-driven cinematic opening.
The existing page sections (destination cards, white package cards and the dark green
footer) are preserved around the new intro.

## Run

```bash
npm install
npm run dev
npm run build
npm run preview
```

## The intro

- **Video-in-type mask** — [`src/components/CinematicIntro.tsx`](src/components/CinematicIntro.tsx)
  renders an inline SVG whose `<clipPath>` contains the Thai title. A real Thailand
  aerial clip lives inside a `<foreignObject>` and is clipped to the glyphs, so the
  video only shows inside `การท่องเที่ยวไทย`.
- **Autoplay + scroll handoff** — on load the intro plays like a short film on a
  clock: the title enters small and dim, zooms exponentially through the letters
  while the footage keeps playing inside them, fades to black, and glides into the
  homepage. The clock scrubs the same scroll timeline, so the first wheel, touch or
  scrollbar move (or the skip button) stops it and hands control to the user.
  Scrolling is never locked and no audio is played.
- **Skip** — “ข้ามแอนิเมชัน” scrolls straight to the homepage and moves focus there.
- **Reduced motion** — `prefers-reduced-motion` swaps the video for its poster, drops
  the scroll choreography and the autoplay, and shows the static intro. Save-Data is
  respected too.
- The video pauses when it leaves the viewport or the tab is hidden.

The video is 1280×720 H.264 with no audio track (~2.9 MB), and the photos are WebP.
Thai display type is self-hosted Kanit, with Noto Sans Thai for body copy.

## Verify

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173  # serve the production build
npm i --no-save playwright-core                   # capture helper (uses installed Edge)
node scripts/check-zoom.mjs                       # writes scroll-progress frames to .screens/zoom
```

The script checks the autoplay timeline (including landing on the homepage), the
interrupt and skip behaviour, the scroll scrub, reduced motion, mobile layout,
horizontal overflow and console errors in one run.

## Assets

- Footage: [“Beach, Nature, Sea”](https://pixabay.com/videos/beach-nature-sea-sand-ocean-water-338904/), Pixabay.
- Photography: Pixabay.
- Fonts: Kanit and Noto Sans Thai (SIL Open Font License).
