import { chromium } from "playwright-core";
import fs from "node:fs";

fs.mkdirSync(".screens", { recursive: true });

const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});

const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://127.0.0.1:4173/", { waitUntil: "commit" });

const t0 = Date.now();
const timeline = [];
let shot = 0;
let skipHitTest = null;
for (const mark of [4400, 4900, 5300, 5800, 6300, 7700]) {
  const wait = mark - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const s = await page.evaluate(() => {
    const skip = document.querySelector(".cinema__skip");
    const r = skip.getBoundingClientRect();
    const hit = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    return {
      t: Math.round(performance.now()),
      scrollY: Math.round(window.scrollY),
      mainTop: document.getElementById("main").offsetTop,
      curtainExists: !!document.querySelector(".cinema__curtain"),
      skipOnTop: hit ? skip.contains(hit) || hit === skip : false,
      skipOpacity: getComputedStyle(skip).opacity,
    };
  });
  timeline.push(s);
  if (mark === 4900) skipHitTest = s;
  shot += 1;
  await page.screenshot({ path: `.screens/e-${shot}.png` });
}

const last = timeline[timeline.length - 1];
console.log(
  JSON.stringify(
    {
      timeline,
      landedOk: Math.abs(last.scrollY - last.mainTop) <= 6,
      noCurtain: timeline.every((s) => !s.curtainExists),
      skipUsableOnBlack: skipHitTest.skipOnTop && skipHitTest.skipOpacity === "1",
      overflowX: await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
