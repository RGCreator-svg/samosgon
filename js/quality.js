const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
export function qualityGrade(score){
  if(score>=92)return {id:"exceptional",label:"Эталонное",price:1.25};
  if(score>=82)return {id:"premium",label:"Премиальное",price:1.15};
  if(score>=68)return {id:"standard",label:"Хорошее",price:1.05};
  if(score>=48)return {id:"basic",label:"Обычное",price:1};
  return {id:"low",label:"Нестабильное",price:.82};
}
export function assessBatchQuality(state,entry={}){
  const base=clamp(entry.quality==null?60:Number(entry.quality));
  const lab=Math.min(8,Math.round((Number(state.lab?.qualityBonus)||0)*.18));
  const standard=entry.recipeId?state.lab?.standards?.[entry.recipeId]:null;
  const standardMatch=!!(standard&&standard.a+":"+standard.b===entry.ratio);
  const standardDelta=standard?(standardMatch?6:-4):0;
  const maintenance=state.maintenance==null?100:clamp(Number(state.maintenance));
  const equipmentDelta=maintenance>=85?2:maintenance>=65?0:maintenance>=40?-3:-7;
  const analysis=state.lab?.lastAnalysis;
  const sampleMatch=!!(entry.rawItem&&analysis?.id===entry.rawItem);
  const sampleDelta=sampleMatch?3:0;
  const total=clamp(base+lab+standardDelta+equipmentDelta+sampleDelta);
  const aroma=clamp(total+(entry.process==="Выдержка"?4:entry.process?.includes("Вин")?2:-2));
  const purity=clamp(total+(maintenance>=75?3:-4)+(standardMatch?2:0));
  const stability=clamp(total+(standardMatch?7:0)+(maintenance>=85?3:maintenance<40?-6:0));
  const grade=qualityGrade(total);
  const factors=[
    {label:"Исходная оценка",value:base,detail:"Результат производственного процесса"},
    {label:"Лаборатория",value:lab,detail:lab?"+ к качеству за исследования":"Нет дополнительного лабораторного бонуса"},
    {label:"Стандарт рецептуры",value:standardDelta,detail:!standard?"Стандарт не закреплён":standardMatch?"Точное совпадение с эталонной пропорцией":"Пропорция отличается от стандарта"},
    {label:"Состояние оборудования",value:equipmentDelta,detail:"Текущее обслуживание: "+maintenance+"%"},
    {label:"Анализ сырья",value:sampleDelta,detail:sampleMatch?"Использован проанализированный тип сырья":"Нет совпадающего протокола сырья"}
  ];
  return {score:total,grade,aroma,purity,stability,base,labBonus:lab,standardDelta,standardMatch,maintenance,equipmentDelta,sampleMatch,factors};
}
export function consumeQualityForSale(state,itemId,quantity=1){
  const need=Math.max(1,Math.floor(Number(quantity)||1));
  const records=(state.productionLog||[]).filter(x=>x.item===itemId&&x.passport);
  let remaining=need,weighted=0,covered=0;
  // FIFO: старые партии продаются раньше новых.
  for(const record of [...records].reverse()){
    const p=record.passport;
    if(p.remaining==null)p.remaining=Math.max(0,Number(p.amount)||0);
    const take=Math.min(remaining,p.remaining);
    if(take<=0)continue;
    weighted+=take*(Number(p.quality)||60);covered+=take;remaining-=take;p.remaining-=take;p.sold=(Number(p.sold)||0)+take;
    if(!remaining)break;
  }
  if(!covered)return {hasPassport:false,quality:null,multiplier:1,reputationDelta:0,grade:null};
  const quality=Math.round(weighted/covered),grade=qualityGrade(quality);
  const multiplier=.8+quality*.0045;
  const reputationDelta=quality>=92?1:quality>=82?.5:quality<35?-1:0;
  if(reputationDelta)state.reputation=Math.max(-100,Math.min(100,(Number(state.reputation)||0)+reputationDelta));
  return {hasPassport:true,quality,multiplier,covered,untracked:remaining,grade,reputationDelta};
}
