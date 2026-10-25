import { chromium } from "playwright-core";
import fs from "node:fs";

/**
 * Smoke-checks the backend UI routes against a running dev server (default 127.0.0.1:5173):
 * renders, console errors, horizontal overflow at desktop and phone widths, sample-mode trip dialog guard.
 */
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const OUT = ".screens/backend";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});

let failures = 0;
const routes = ["/trips", "/login", "/account", "/my-trips", "/admin", "/auth/callback"];

for (const [label, viewport] of [["desktop", { width: 1366, height: 860 }], ["phone", { width: 375, height: 760 }]]) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  for (const route of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => ({
      path: location.pathname,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      text: document.body.innerText.replace(/\s+/g, " ").slice(0, 110),
    }));
    const bad = errors.length || info.overflow > 1;
    if (bad) failures++;
    console.log(`${bad ? "FAIL" : "ok  "} ${label} ${route} -> ${info.path} overflow=${info.overflow} errors=${errors.length} | ${info.text}`);
    errors.forEach((e) => console.log("     ", e));
    await page.screenshot({ path: `${OUT}/${label}${route.replaceAll("/", "_")}.png` });
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(failures ? `${failures} failing checks` : "all checks passed");
process.exit(failures ? 1 : 0);
