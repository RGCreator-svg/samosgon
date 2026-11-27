import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

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
  assert.equal(await page.locator("#game-layout > .game-advisor").count(), 0, "Advisor cards must not occupy side columns");
  assert.equal(await page.locator(".advice-drawer").count(), 1, "Advisor drawer is missing");
  const layout = await page.locator("#game-layout").evaluate(el => ({ width:el.getBoundingClientRect().width, columns:getComputedStyle(el).gridTemplateColumns }));
  assert.ok(layout.width >= 1200, "Game layout does not use the full desktop viewport");
  const navDisplay = await page.locator(".navigation").evaluate(el => getComputedStyle(el).display);
  assert.equal(navDisplay, "grid", "Navigation must use the aligned grid layout");
  const consoleFont = await page.locator(".event-console h2").evaluate(el => getComputedStyle(el).fontFamily);
  assert.match(consoleFont, /mono/i, "Event console must use a terminal-style monospace font");

  // Scene hotspots must open the matching DOM section.
  await page.mouse.click(box.x + box.width*.16, box.y + box.height*.73);
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#farm").evaluate(el=>el.classList.contains("hidden")), false, "Farm hotspot did not open farm tab");

  // Menu navigation must also keep working.
  await page.locator('.navigation [data-tab="orchard"]').click();
  assert.equal(await page.locator("#orchard").evaluate(el=>el.classList.contains("hidden")), false, "Orchard menu item did not open orchard tab");

  // Compare rendered frames to confirm that click-to-move changes the game canvas.
  const startPosition = await page.evaluate(() => ({ x:window.__samosgonScene.player.x, y:window.__samosgonScene.player.y }));
  await page.mouse.click(box.x + box.width*.34, box.y + box.height*.91);
  await page.waitForTimeout(900);
  const clickPosition = await page.evaluate(() => ({ x:window.__samosgonScene.player.x, y:window.__samosgonScene.player.y }));
  assert.ok(Math.hypot(clickPosition.x-startPosition.x,clickPosition.y-startPosition.y)>5, "Click-to-move did not change the player position");

  // Keyboard movement must update the player's world position as well.
  const beforeKey = await page.evaluate(() => ({ x:window.__samosgonScene.player.x, y:window.__samosgonScene.player.y }));
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(350);
  await page.keyboard.up("ArrowRight");
  const afterKey = await page.evaluate(() => ({ x:window.__samosgonScene.player.x, y:window.__samosgonScene.player.y }));
  assert.ok(afterKey.x>beforeKey.x+10, "Keyboard movement did not move the player to the right");

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
