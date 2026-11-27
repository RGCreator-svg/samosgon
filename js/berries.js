import { addInventory } from "./economy.js";

export const BERRY_CROPS = [
  {id:"blackcurrant",name:"Чёрная смородина",emoji:"🫐",description:"Неприхотливый куст с урожаем для насыщенной настойки.",seedCost:32,growDays:3,regrowDays:2,yield:3,seasons:["summer"]},
  {id:"raspberry",name:"Малина",emoji:"🍓",description:"Ароматная летняя ягода; при хорошем уходе плодоносит повторно.",seedCost:36,growDays:3,regrowDays:2,yield:3,seasons:["summer","autumn"]},
  {id:"blueberry",name:"Черника",emoji:"🫐",description:"Медленно приживается, зато ценится в авторских купажах.",seedCost:42,growDays:4,regrowDays:3,yield:3,seasons:["summer"]},
  {id:"cranberry",name:"Клюква",emoji:"🔴",description:"Поздняя ягода для осенних сборов и лесных купажей.",seedCost:30,growDays:4,regrowDays:3,yield:3,seasons:["autumn"]}
];

const SEASONS=["spring","summer","autumn","winter"];
export function ensureBerryGarden(state){
  state.viticulture??={buildings:[],batches:[],nextId:1};
  state.viticulture.berryGarden??={plots:[],nextPlotId:1};
  state.viticulture.berryGarden.plots??=[];
  state.viticulture.berryGarden.nextPlotId??=1;
  return state.viticulture.berryGarden;
}
export function plantBerryBush(state,berryId){
  const crop=BERRY_CROPS.find(item=>item.id===berryId);
  const garden=ensureBerryGarden(state);
  if(!crop||garden.plots.length>=6)return null;
  const plot={id:garden.nextPlotId++,berryId,remaining:crop.growDays,ready:false,readyAmount:0};
  garden.plots.push(plot);
  return plot;
}
export function advanceBerryGardenDay(state){
  const garden=ensureBerryGarden(state);
  const season=SEASONS.includes(state.world?.season)?state.world.season:"spring";
  if(season==="winter")return;
  garden.plots.forEach(plot=>{
    if(plot.ready)return;
    plot.remaining=Math.max(0,(Number(plot.remaining)||0)-1);
    if(plot.remaining===0){
      const crop=BERRY_CROPS.find(item=>item.id===plot.berryId);
      if(!crop)return;
      const weather=state.world?.weather;
      const weatherBonus=weather==="rain"?1:weather==="heat"?-1:0;
      const skillBonus=state.skills?.includes("big_harvest")?1:0;
      plot.readyAmount=Math.max(1,crop.yield+weatherBonus+skillBonus);
      plot.ready=true;
    }
  });
}
export function harvestBerryBush(state,plotId){
  const garden=ensureBerryGarden(state);
  const plot=garden.plots.find(item=>Number(item.id)===Number(plotId));
  if(!plot?.ready)return {harvested:0,remaining:plot?.readyAmount||0};
  const crop=BERRY_CROPS.find(item=>item.id===plot.berryId);
  const season=state.world?.season||"spring";
  if(!crop?.seasons.includes(season))return {harvested:0,remaining:plot.readyAmount,wrongSeason:true};
  const requested=Math.max(0,Number(plot.readyAmount)||0);
  const harvested=addInventory(state,plot.berryId,requested);
  plot.readyAmount-=harvested;
  if(plot.readyAmount<=0){
    plot.ready=false;
    plot.remaining=crop.regrowDays;
    plot.readyAmount=0;
  }
  return {harvested,remaining:plot.readyAmount,regrowing:!plot.ready};
}
