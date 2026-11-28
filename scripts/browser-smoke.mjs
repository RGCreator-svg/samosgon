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
  assert.deepEqual(errors,[],"Browser errors occurred during initial game render: "+errors.join(" | "));
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
  assert.equal(await page.locator(".prototype-side").count(),0,"Legacy side panel should be consolidated into the main navigation");
  const navigationText=await page.locator(".navigation").innerText();
  for(const label of ["Достижения","Задания","Цели"]) assert.ok(navigationText.includes(label),`Journal shortcut ${label} is missing from grouped navigation`);
  const groupTitles=await page.locator(".navigation .nav-group-title").allTextContents();
  for(const group of ["УСАДЬБА","ТОРГОВЛЯ","ПРОИЗВОДСТВО","РАЗВИТИЕ","ЖУРНАЛ"]) assert.ok(groupTitles.includes(group),`Navigation group ${group} is missing`);
  assert.ok(await page.locator(".player-profile").isVisible(),"Player avatar/profile HUD is missing");
  assert.equal(await page.locator(".prototype-task").count(),1,"There should be only one homestead objective");
  assert.equal(await page.locator(".prototype-task").evaluate(el=>el.parentElement.id),"home","Homestead objective should live inside the home section, not float over the scene");
  assert.ok(await page.locator(".player-profile #xpBar").count()===1,"XP progress must be shown inside player profile");
  assert.ok(await page.locator("#wellDevelopmentAction").isVisible(),"Well development task is missing");
  assert.ok(await page.locator("#advanceDayShortcut").isVisible(),"Visible day-advance control is missing");
  const wellText=(await page.locator("#wellDevelopmentStatus").innerText())+" "+(await page.locator("#wellDevelopmentDetails").innerText());
  assert.match(wellText,/пиломатериалы|инструмент|Водоснабжение полностью/i,"Well development status or requirements are not displayed");
  await page.locator('.navigation [data-tab="productionHub"]').click();
  assert.equal(await page.locator("#productionHub").evaluate(el=>el.classList.contains("hidden")),false,"Production shortcut did not open the production dispatcher");
  assert.ok(await page.locator("#productionHub").innerText().then(text=>text.includes("Главное дело — самогоноварение")),"Production dispatcher did not render");
  await page.locator('.navigation [data-tab="home"]').click();
  const cartToggle=page.locator("#cartToggle");
  await cartToggle.waitFor({state:"visible"});
  assert.ok(await cartToggle.locator("img").evaluate(img=>img.complete&&img.naturalWidth>0),"Cart illustration failed to load");
  await cartToggle.click();
  assert.ok(await page.locator("#sharedPurchaseCart").evaluate(el=>el.classList.contains("is-open")),"Cart launcher did not open the cart");

  // Repair lifecycle: order missing materials, wait for their delivery, collect, then pay labor and repair.
  await page.locator("#devToggle").click();
  await page.locator('#devForm [name="money"]').fill("1000");
  await page.locator("#devForm .dev-apply").click();

  async function repairThroughDelivery(tabId, buttonSelector, partIds, progressSelector, laborCost, completeLabel) {
    await page.locator(`.navigation [data-tab="${tabId}"]`).click();
    const progress=page.locator(progressSelector);
    const beforeProgress=await progress.innerText();
    const beforeMoney=Number((await page.locator("#money").innerText()).replace(/[^0-9-]/g,""));
    await page.locator(buttonSelector).click();
    assert.match(await page.locator("#materialCart").innerText(),/Пиломатериалы|Металлические заготовки|Крепёж|Инструмент/i,"Repair materials were not added to the cart");
    assert.equal(Number((await page.locator("#money").innerText()).replace(/[^0-9-]/g,"")),beforeMoney,"Labor must not be charged when materials are merely ordered");
    assert.equal(await progress.innerText(),beforeProgress,"Repair must not happen when the order is added");
    if(!await page.locator("#sharedPurchaseCart").evaluate(el=>el.classList.contains("is-open"))) await cartToggle.click();
    await page.locator("#materialCart [data-economy-action='pay']").click();
    assert.equal(await progress.innerText(),beforeProgress,"Paying for materials must not perform the repair");
    assert.match(await page.locator("#notifications").innerText(),/доставк/i,"Cart payment did not start a delivery");
    const deliveryDays={timber:1,fasteners:1,paint:1,metal:2,tools:2};
    const maxDeliveryDays=partIds.reduce((max,id)=>Math.max(max,deliveryDays[id]||1),0);
    for(let day=0;day<maxDeliveryDays;day++) await page.locator("#advanceDayShortcut").click();
    await page.locator('.navigation [data-tab="economy"]').click();
    for(const id of partIds){
      const collect=page.locator(`#partsDeliveries [data-economy-action="collectAll:${id}"]`);
      if(await collect.count()) await collect.click();
    }
    await page.locator(`.navigation [data-tab="${tabId}"]`).click();
    const moneyBeforeWork=Number((await page.locator("#money").innerText()).replace(/[^0-9-]/g,""));
    await page.locator(buttonSelector).click({force:true});
    assert.notEqual(await progress.innerText(),beforeProgress,"Repair must take effect only after materials are on the warehouse");
    assert.equal(Number((await page.locator("#money").innerText()).replace(/[^0-9-]/g,"")),moneyBeforeWork-laborCost,"Labor must be charged at the moment of repair");
    if(completeLabel) assert.match(await page.locator(buttonSelector).innerText(),new RegExp(completeLabel));
  }

  await repairThroughDelivery("home","#repairHouse",["timber","fasteners","paint"],"#houseValue",30);
  await repairThroughDelivery("farm","#repairGarden",["timber","fasteners"],"#gardenValue",20);


  // Scene hotspots use the existing game's tab controller.
  await page.locator("#scene-beds").click({force:true});
  assert.equal(await page.locator("#farm").evaluate(el=>el.classList.contains("hidden")),false,"Garden scene hotspot did not open the farm tab");
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
  console.log("Browser smoke passed: Prototype screen, SVG scene, pumpkin/cart images, cart launcher/payment, house and garden repair delivery, scene hotspot, navigation, warehouse control, pumpkin interaction, mobile viewport; no browser errors.");
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
