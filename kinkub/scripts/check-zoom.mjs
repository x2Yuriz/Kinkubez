import { chromium } from "playwright-core";
import fs from "node:fs";

/**
 * Verifies the cinematic intro end to end:
 *   A. autoplay plays the whole clip-like timeline by itself and lands on the homepage
 *   B. the first user scroll cancels autoplay, and the skip button still works mid-play
 *   C. scroll scrubbing, reduced motion, mobile layout, overflow, console errors
 * Run `npm run preview -- --host 127.0.0.1 --port 4173` first.
 */
const OUT = ".screens/zoom";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});

const errors = [];

const probe = (page) =>
  page.evaluate(() => {
    const shell = document.querySelector(".cinema__title-shell");
    const reveal = document.querySelector(".cinema__title-reveal");
    if (!shell || !reveal) return { pending: true };
    const zoom = new DOMMatrixReadOnly(getComputedStyle(shell).transform).a;
    const enter = new DOMMatrixReadOnly(getComputedStyle(reveal).transform).a;
    return {
      t: Math.round(performance.now()),
      scrollY: Math.round(window.scrollY),
      enterScale: Number(enter.toFixed(2)),
      zoomScale: Number(zoom.toFixed(2)),
      titleOpacity: Number(getComputedStyle(shell).opacity),
      mainTop: document.getElementById("main").offsetTop,
    };
  });

// ---------- A: autoplay timeline (no user input) ----------
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://127.0.0.1:4173/", { waitUntil: "commit" });

const t0 = Date.now();
const timeline = [];
let shot = 0;
for (const mark of [400, 1100, 2100, 3000, 3700, 4400, 5100, 5700, 7600]) {
  const wait = mark - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  timeline.push(await probe(page));
  shot += 1;
  await page.screenshot({ path: `${OUT}/a-${shot}.png` });
}
const landed = timeline[timeline.length - 1];

// ---------- B1: first user scroll stops the clock ----------
const p2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
p2.on("pageerror", (e) => errors.push(`interrupt: ${String(e)}`));
await p2.goto("http://127.0.0.1:4173/", { waitUntil: "commit" });
await p2.waitForTimeout(2300); // mid-zoom
const before = await p2.evaluate(() => Math.round(window.scrollY));
await p2.evaluate(() => window.scrollBy(0, 150));
await p2.waitForTimeout(1700);
const after = await p2.evaluate(() => Math.round(window.scrollY));

// ---------- B2: skip button works while autoplay runs ----------
const p3 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
p3.on("pageerror", (e) => errors.push(`skip: ${String(e)}`));
await p3.goto("http://127.0.0.1:4173/", { waitUntil: "commit" });
await p3.waitForTimeout(2500); // autoplay mid-zoom
const skipOpacity = await p3.evaluate(
  () => getComputedStyle(document.querySelector(".cinema__skip")).opacity,
);
await p3.click(".cinema__skip");
await p3.waitForTimeout(1700);
const skipLanded = await p3.evaluate(() => ({
  scrollY: Math.round(window.scrollY),
  mainTop: document.getElementById("main").offsetTop,
}));

// ---------- C: scroll scrub, responsive, reduced motion ----------
const travel = await page.evaluate(() => {
  const c = document.querySelector(".cinema");
  const s = document.querySelector(".cinema__stage");
  return c.offsetHeight - s.offsetHeight;
});

const stops = [0, 0.25, 0.45, 0.6, 0.75, 0.9];
for (const p of stops) {
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    Math.round(travel * p),
  );
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/d-${String(p).replace(".", "_")}.png` });
}

await page.evaluate(
  (y) => window.scrollTo({ top: y, behavior: "instant" }),
  Math.round(travel * 0.5),
);
await page.waitForTimeout(350);
const skipMidZoom = await page.evaluate(() => {
  const b = document.querySelector(".cinema__skip");
  const r = b.getBoundingClientRect();
  return { opacity: getComputedStyle(b).opacity, onScreen: r.top >= 0 };
});

await page.evaluate(
  (y) => window.scrollTo({ top: y, behavior: "instant" }),
  travel,
);
await page.waitForTimeout(450);
await page.screenshot({ path: `${OUT}/d-end.png` });
await page.evaluate(() =>
  window.scrollTo({ top: window.scrollY + 700, behavior: "instant" }),
);
await page.waitForTimeout(450);
await page.screenshot({ path: `${OUT}/d-home.png` });
const overflowDesktop = await page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);

const m = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
m.on("pageerror", (e) => errors.push(`mobile: ${String(e)}`));
await m.goto("http://127.0.0.1:4173/", { waitUntil: "commit" });
await m.waitForTimeout(2600);
await m.screenshot({ path: `${OUT}/m-0.png` });
const overflowMobile = await m.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);

const r = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await r.emulateMedia({ reducedMotion: "reduce" });
await r.goto("http://127.0.0.1:4173/", { waitUntil: "commit" });
await r.waitForTimeout(1500);
const rm = await r.evaluate(() => {
  const c = document.querySelector(".cinema");
  const shell = document.querySelector(".cinema__title-shell");
  return {
    scrollYAtLoad: Math.round(window.scrollY),
    cinemaHeight: c.offsetHeight,
    viewportH: window.innerHeight,
    shellTransform: getComputedStyle(shell).transform,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
  };
});
await r.screenshot({ path: `${OUT}/rm-0.png` });

console.log(
  JSON.stringify(
    {
      timeline,
      autoplayLanded: {
        scrollY: landed.scrollY,
        mainTop: landed.mainTop,
        ok: Math.abs(landed.scrollY - landed.mainTop) <= 6,
      },
      interrupt: { before, after, ok: Math.abs(after - (before + 150)) < 40 },
      skipDuringAutoplay: { skipOpacity, ...skipLanded, ok: null },
      skipMidZoom,
      overflowDesktop,
      overflowMobile,
      rm,
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
