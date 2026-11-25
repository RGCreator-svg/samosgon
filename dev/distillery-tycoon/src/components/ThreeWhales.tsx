import React from 'react';
import { useGame } from '../store/useGame';
import { PRODUCTS } from '../domain/catalog';
import infographic from '../assets/infographic.png';

export function ThreeWhales() {
  const batches = useGame((s: any) => s.batches);
  const warehouse = useGame((s: any) => s.warehouse);
  const fer = batches.filter((b: any) => !b.ready).length;
  const ready = batches.filter((b: any) => b.ready).length;
  const rawL = (warehouse['raw-sugar'] || 0) + (warehouse['raw-fruit'] || 0) + (warehouse['raw-veg'] || 0);
  const readyL = PRODUCTS.reduce((a, p) => a + (warehouse[p.id] || 0), 0);
  return (
    <div className="whales-wrap">
      <img src={infographic} className="whales-img" alt="Три кита" />
      <div className="whale-cards">
        <div className="whale-card">
          <div className="whale-title">Приготовление браги</div>
          <div className="whale-desc">Бродит: {fer} · Готовы: {ready}</div>
        </div>
        <span className="whale-arrow">→</span>
        <div className="whale-card">
          <div className="whale-title">Разделение</div>
          <div className="whale-desc">Сырца на складе: {rawL.toFixed(1)} л</div>
        </div>
        <span className="whale-arrow">→</span>
        <div className="whale-card">
          <div className="whale-title">Улучшение</div>
          <div className="whale-desc">Готовой продукции: {readyL.toFixed(1)} л</div>
        </div>
      </div>
    </div>
  );
}
