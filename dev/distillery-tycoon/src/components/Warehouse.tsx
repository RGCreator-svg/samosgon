import React from 'react';
import { useGame } from '../store/useGame';
import { PRODUCTS_BY_ID, MATERIALS } from '../domain/catalog';

export function Warehouse() {
  const warehouse = useGame((s: any) => s.warehouse);
  const capacity = useGame((s: any) => s.capacity);
  const usedUnits = useGame((s: any) => s.usedUnits);
  const capacityUnits = useGame((s: any) => s.capacityUnits);
  const cap = capacity();
  const used = usedUnits();
  const units = capacityUnits();
  const entries = Object.keys(warehouse).filter((k) => warehouse[k] > 0).map((k) => ({
    id: k,
    name: (PRODUCTS_BY_ID[k] || MATERIALS[k] || { name: k }).name,
    qty: warehouse[k],
    isProduct: !!PRODUCTS_BY_ID[k],
  }));
  return (
    <div className="panel">
      <h2>Склад</h2>
      <div className="cap-bar"><div className="cap-fill" style={{ width: Math.min(100, (used / units) * 100) + '%' }} /></div>
      <div className="cap-text">Заполнено: {used} / {units} ед. ({cap} слотов × 5 ед.)</div>
      <div className="cards">
        {entries.map((e) => (
          <div className={'inv-card' + (e.isProduct ? ' prod' : '')} key={e.id}>
            <div className="inv-name">{e.name}</div>
            <div className="inv-qty">{e.qty}</div>
          </div>
        ))}
        {entries.length === 0 && <div className="sc-desc">Склад пуст. Скупай сахар и ставь брагу!</div>}
      </div>
      <h3>Расширение</h3>
      <div className="sc-desc">Стеллаж, сарай, амбар и логистический центр покупаются в магазине, раздел «Стройка склада».</div>
    </div>
  );
}
