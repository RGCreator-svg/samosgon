import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".svg":"image/svg+xml",".json":"application/json; charset=utf-8"};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    const target=path.resolve(root,"."+(pathname==="/"?"/index.html":pathname));
    assert.ok(target.startsWith(root+path.sep),"Invalid static path");
    await stat(target);
    res.writeHead(200,{"content-type":mime[path.extname(target)]||"application/octet-stream"});
    res.end(await readFile(target));
  }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(resolve=>server.listen(4173,"127.0.0.1",resolve));
let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:960}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle",timeout:45000});
  assert.match(await page.title(),/Самогон/);
  assert.ok(await page.locator("#intro").isVisible(),"Title screen must remain visible until player continues");
  assert.match(await page.locator("#intro").innerText(),/После череды неудач/,"Opening story text is missing");
  await page.locator("#startGame").click();
  await page.locator("#homestead-scene").waitFor({state:"visible"});
  assert.ok(await page.locator(".game-footer-dock").isVisible(),"Bottom HUD dock is missing");
  const dock=await page.locator(".game-footer-dock").boundingBox();
  assert.ok(dock.y+dock.height>=950,"Pumpkin and event log are not anchored to the bottom of the viewport");
  assert.ok(await page.locator(".event-console").isVisible(),"Event log is hidden from the bottom dock");
  assert.ok(await page.locator(".xp-panel").boundingBox().then(box=>box.height<45),"XP display is not compact");
  assert.ok(await page.locator("#homestead-scene").count()===1,"Prototype SVG scene is missing");
  assert.equal(await page.locator(".pumpkin-mascot").count(),1,"There must be exactly one interactive pumpkin mascot");
  assert.equal(await page.locator("#scene-pumpkin").isVisible(),false,"Decorative duplicate pumpkin should be hidden");
  const pumpkin=page.locator(".pumpkin-mascot img");
  await pumpkin.waitFor({state:"visible"});
  const imageLoaded=await pumpkin.evaluate(img=>img.complete&&img.naturalWidth>0);
  assert.ok(imageLoaded,"Squash.png pumpkin asset failed to load");
  assert.ok(await page.locator(".navigation button[data-tab]").count()>=10,"Top navigation did not include dynamic game sections");
  assert.equal(await page.locator(".prototype-side .side-btn").count(),0,"Duplicate side shortcuts should be removed");
  const cartToggle=page.locator("#cartToggle");
  await cartToggle.waitFor({state:"visible"});
  assert.ok(await cartToggle.locator("img").evaluate(img=>img.complete&&img.naturalWidth>0),"Cart illustration failed to load");
  await cartToggle.click();
  assert.ok(await page.locator("#sharedPurchaseCart").evaluate(el=>el.classList.contains("is-open")),"Cart launcher did not open the cart");

  // Repair labor is charged directly; only required materials appear in the cart.
  await page.locator("#devToggle").click();
  await page.locator('#devForm [name="money"]').fill("1000");
  await page.locator("#devForm .dev-apply").click();
  await page.locator("#repairHouse").click();
  assert.match(await page.locator("#materialCart").innerText(),/Пиломатериалы|Краска|Крепёж/i,"House repair materials were not queued");
  assert.doesNotMatch(await page.locator("#materialCart").innerText(),/Ремонт дома|30 монет/,"Repair service fee leaked into the material cart");
  assert.equal(await page.locator("#money").innerText(),"970","House repair labor fee was not charged immediately");
  await page.locator("#materialCart [data-economy-action='pay']").click();
  assert.match(await page.locator("#notifications").innerText(),/корзина оплачена/i,"Cart payment did not execute");

  await page.locator('.navigation [data-tab="farm"]').click();
  await page.locator("#repairGarden").click();
  assert.match(await page.locator("#materialCart").innerText(),/Пиломатериалы|Крепёж/i,"Garden clearing materials were not queued");
  assert.doesNotMatch(await page.locator("#materialCart").innerText(),/Расчистка огорода/,"Garden service leaked into the material cart");
  await page.locator("#materialCart [data-economy-action='pay']").click();
  await page.locator("#harvestVegetables").click();

  await page.locator('.navigation [data-tab="orchard"]').click();
  await page.locator("#restoreOrchard").click();
  assert.match(await page.locator("#materialCart").innerText(),/Пиломатериалы|Инструмент|Крепёж/i,"Orchard restoration materials were not queued");
  assert.doesNotMatch(await page.locator("#materialCart").innerText(),/Восстановление сада/,"Orchard service leaked into the material cart");
  await page.locator("#materialCart [data-economy-action='pay']").click();
  await page.locator("#harvestFruit").click();

  await page.locator('.navigation [data-tab="barn"]').click();
  await page.locator("#repairStill").click();
  assert.match(await page.locator("#materialCart").innerText(),/Металлические заготовки|Инструмент|Крепёж/i,"Still repair materials were not queued");
  assert.doesNotMatch(await page.locator("#materialCart").innerText(),/Ремонт аппарата/,"Still service leaked into the material cart");
  await page.locator("#materialCart [data-economy-action='pay']").click();

  // Scene hotspots use the existing game's tab controller.
  await page.locator("#scene-tree").click({force:true});
  assert.equal(await page.locator("#orchard").evaluate(el=>el.classList.contains("hidden")),false,"Orchard scene hotspot did not open the orchard tab");
  await page.locator('.navigation [data-tab="market"]').click();
  assert.equal(await page.locator("#market").evaluate(el=>el.classList.contains("hidden")),false,"Top navigation did not open market");
  await page.locator("#bottomWarehouse").click();
  assert.equal(await page.locator(".warehouse-panel").getAttribute("open"),"","Bottom warehouse control did not expand storage");

  const bubble=page.locator("#pumpkinSay");
  const before=await bubble.textContent();
  await page.locator("#pumpkinMascot").click();
  assert.notEqual(await bubble.textContent(),before,"Pumpkin mascot click did not update its speech bubble");

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(200);
  assert.ok(await page.locator("#homestead-scene").isVisible(),"Farm scene disappeared on mobile viewport");
  const widths=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));
  assert.ok(widths.body<=widths.viewport+2,"Horizontal page overflow on mobile");
  assert.deepEqual(errors,[],"Browser console/page errors detected");
  console.log("Browser smoke passed: Prototype screen, SVG scene, pumpkin/cart images, cart launcher/payment, house repair, garden clearing, vegetable harvest, scene hotspot, navigation, warehouse control, pumpkin interaction, mobile viewport; no browser errors.");
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
