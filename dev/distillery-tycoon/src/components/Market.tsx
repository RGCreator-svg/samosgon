import React from 'react';
import { useGame } from '../store/useGame';
import { PRODUCTS } from '../domain/catalog';

export function Market() {
  const priceOf = useGame((s: any) => s.priceOf);
  const sell = useGame((s: any) => s.sell);
  const warehouse = useGame((s: any) => s.warehouse);
  const marketMult = useGame((s: any) => s.marketMult);
  const available = PRODUCTS.filter((p) => (warehouse[p.id] || 0) > 0);
// и в разметке: p.id, p.name, warehouse[p.id], sell(p.id, 1), sell(p.id, warehouse[p.id])

  return (
    <div className="panel">
      <h2>Рынок</h2>
      <div className="market-note">
        Настроение рынка: {(marketMult * 100).toFixed(0)}% от базовой цены. Продаёшь — получаешь очко умений.
      </div>
      <div className="cards">
        {available.map((p) => (
          <div className="shop-card" key={p.id}>
            <div className="sc-name">{p.name}</div>
            <div className="inv-qty">{warehouse[p.id].toFixed(1)} л</div>
            <div className="sc-price">{priceOf(p.id).toLocaleString('ru')} руб./л</div>
            <button className="btn" onClick={() => sell(p.id, 1)}>Продать 1 л</button>
            <button className="btn gold" onClick={() => sell(p.id, warehouse[p.id])}>Продать всё</button>
          </div>
        ))}
        {available.length === 0 && <div className="sc-desc">Пока нечего продавать — готовь партии!</div>}
      </div>
    </div>
  );
}
