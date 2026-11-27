import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8" };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    const target = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    assert.ok(target.startsWith(root + path.sep), "Invalid static path");
    await stat(target);
    const body = await readFile(target);
    res.writeHead(200, { "content-type": mime[path.extname(target)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
});
await new Promise(resolve => server.listen(4173,"127.0.0.1",resolve));

let browser;
try {
  browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{ width:1280,height:900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if(message.type()==="error") pageErrors.push(message.text()); });

  await page.goto("http://127.0.0.1:4173/", { waitUntil:"networkidle", timeout:45000 });
  assert.match(await page.title(), /Самогон/);
  await page.locator("#startGame").click();
  await page.locator("#game-world canvas").waitFor({ state:"visible", timeout:30000 });
  await page.waitForTimeout(1200);

  const canvas = page.locator("#game-world canvas");
  const box = await canvas.boundingBox();
  assert.ok(box && box.width > 300 && box.height > 100, "Phaser canvas must have a visible size");
  assert.ok(await page.locator(".navigation .nav-group").count() >= 3, "Navigation groups were not rendered");

  // Scene hotspots must open the matching DOM section.
  await page.mouse.click(box.x + box.width*.16, box.y + box.height*.73);
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#farm").evaluate(el=>el.classList.contains("hidden")), false, "Farm hotspot did not open farm tab");

  // Menu navigation must also keep working.
  await page.locator('.navigation [data-tab="orchard"]').click();
  assert.equal(await page.locator("#orchard").evaluate(el=>el.classList.contains("hidden")), false, "Orchard menu item did not open orchard tab");

  // Compare rendered frames to confirm that click-to-move changes the game canvas.
  const before = await canvas.screenshot();
  await page.mouse.click(box.x + box.width*.34, box.y + box.height*.91);
  await page.waitForTimeout(900);
  const after = await canvas.screenshot();
  assert.notEqual(crypto.createHash("sha256").update(before).digest("hex"), crypto.createHash("sha256").update(after).digest("hex"), "Click-to-move did not change the rendered frame");

  // Keyboard movement must change the rendered frame as well.
  const beforeKey = await canvas.screenshot();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(350);
  await page.keyboard.up("ArrowRight");
  const afterKey = await canvas.screenshot();
  assert.notEqual(crypto.createHash("sha256").update(beforeKey).digest("hex"), crypto.createHash("sha256").update(afterKey).digest("hex"), "Keyboard movement did not change the rendered frame");

  // Narrow viewport: canvas remains present and usable.
  await page.setViewportSize({ width:390,height:844 });
  await page.waitForTimeout(500);
  const mobileBox = await canvas.boundingBox();
  assert.ok(mobileBox && mobileBox.width > 250 && mobileBox.height > 80, "Canvas is not visible at mobile viewport width");
  assert.deepEqual(pageErrors, [], "Browser console/page errors detected");

  console.log("Browser smoke passed: page render, Phaser canvas, grouped menu, scene hotspot, DOM navigation, pointer movement, keyboard movement, mobile viewport; no page errors.");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
