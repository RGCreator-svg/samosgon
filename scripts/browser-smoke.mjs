import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".json":"application/json; charset=utf-8"};
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
  await page.locator("#startGame").click();
  await page.locator("#homestead-scene").waitFor({state:"visible"});
  assert.ok(await page.locator("#homestead-scene").count()===1,"Prototype SVG scene is missing");
  const pumpkin=page.locator(".pumpkin-mascot img");
  await pumpkin.waitFor({state:"visible"});
  const imageLoaded=await pumpkin.evaluate(img=>img.complete&&img.naturalWidth>0);
  assert.ok(imageLoaded,"Squash.png pumpkin asset failed to load");
  assert.ok(await page.locator(".navigation button[data-tab]").count()>=10,"Top navigation did not include dynamic game sections");
  assert.ok(await page.locator(".prototype-side .side-btn").count()===3,"Prototype side controls missing");

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
  console.log("Browser smoke passed: Prototype screen, SVG scene, pumpkin image, scene hotspot, navigation, warehouse control, pumpkin interaction, mobile viewport; no browser errors.");
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
