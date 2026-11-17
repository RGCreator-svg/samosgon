import React from 'react';
import { useGame } from '../store/useGame';
import { RECIPES, MATERIALS } from '../domain/catalog';
import { bonuses } from '../domain/skillTree';
import { ThreeWhales } from './ThreeWhales';
import { WhalesProgress } from "./WhalesProgress";

export function Production() {
  const skills = useGame((s: any) => s.skills);
  const warehouse = useGame((s: any) => s.warehouse);
  const equipment = useGame((s: any) => s.equipment);
  const batches = useGame((s: any) => s.batches);
  const startBatch = useGame((s: any) => s.startBatch);
  const distill = useGame((s: any) => s.distill);
  const bottle = useGame((s: any) => s.bottle);
  const rectifyAll = useGame((s: any) => s.rectifyAll);
  const barrelAll = useGame((s: any) => s.barrelAll);
  const columnComplete = useGame((s: any) => s.columnComplete);
  const say = useGame((s: any) => s.say);

  const bn = bonuses(skills);
  const unlocked = RECIPES.filter((r) => {
    if (!r.needs) return true;
    if (r.needs === 'mead') return bn.mead;
    if (r.needs === 'cider') return bn.cider;
    if (r.needs === 'tinct') return bn.tinct;
    if (r.needs === 'brewery') return equipment.includes('brew-kettle');
    return true;
  });
const missing = (r: any) => {
  const need = r?.inputs ?? r?.input ?? {};
  return Object.keys(need)
    .filter((k) => (warehouse[k] || 0) < need[k])
    .map((k) => MATERIALS[k]?.name ?? k);
};


  const rawL = (warehouse['raw-sugar'] || 0) + (warehouse['raw-fruit'] || 0) + (warehouse['raw-veg'] || 0);

  return (
    <div className="panel" style={{ flex: 1 }}>
      <h2>Производство</h2>
      <ThreeWhales />
      <h2>Производство</h2>
<ThreeWhales />
<WhalesProgress />
<h3>Поставить партию</h3>
      <div className="cards">
        {unlocked.map((r) => {
          const miss = missing(r);
          return (
            <div className="shop-card" key={r.id}>
              <div className="sc-name">{r.name}</div>
              <div className="sc-desc">
                {Object.keys(r.inputs).map((k) =>
                  MATERIALS[k] ? MATERIALS[k].name + ': ' + r.inputs[k] : k + ': ' + r.inputs[k]
                ).join(', ')} · {r.days} дн. · ~{r.liters} л
              </div>
              {miss.length > 0 && <div className="sc-desc" style={{ color: '#e07070' }}>Нет: {miss.join(', ')}</div>}
              <button className="btn" disabled={miss.length > 0} onClick={() => startBatch(r.id)}>Поставить</button>
            </div>
          );
        })}
      </div>
      <h3>Чаны ({batches.length}/4)</h3>
      {batches.length === 0 && <div className="sc-desc">Пусто. Поставь партию!</div>}
      {batches.map((b: any) => {
        const r = RECIPES.find((x) => x.id === b.recipeId)!;
        const isDistill = ['mash', 'fruit', 'veg'].includes(r.kind);
        return (
          <div className="batch-row" key={b.id}>
            <div className="batch-name">{r.name}</div>
            {b.ready ? (
              isDistill ? (
                <button className="btn gold" onClick={() => distill(b.id)}>Перегнать</button>
              ) : (
                <button className="btn gold" onClick={() => bottle(b.id)}>Разлить</button>
              )
            ) : (
              <span className="sc-desc">Бродит: {b.daysLeft} дн.</span>
            )}
          </div>
        );
      })}
      {rawL > 0 && (
        <div style={{ marginTop: 14 }}>
          <h3>Сырец на складе: {rawL.toFixed(1)} л</h3>
          {columnComplete() && <button className="btn gold" onClick={rectifyAll}>Ректифицировать всё</button>}
          {columnComplete() && <span> </span>}
          {(equipment.includes('barrel-oak') || equipment.includes('barrel-france')) && (
            <button className="btn" onClick={barrelAll}>Залить в бочку</button>
          )}
          {!columnComplete() && !equipment.includes('barrel-oak') && !equipment.includes('barrel-france') && (
            <div className="sc-desc">Купи детали колонны или бочку в магазине, чтобы улучшать сырец.</div>
          )}
        </div>
      )}
    </div>
  );
}
