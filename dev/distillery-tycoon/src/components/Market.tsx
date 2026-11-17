import React from 'react';
import { useGame } from '../store/useGame';
import { PRODUCTS } from '../domain/catalog';

export function Market() {
  const priceOf = useGame((s: any) => s.priceOf);
  const sell = useGame((s: any) => s.sell);
  const warehouse = useGame((s: any) => s.warehouse);
  const marketMult = useGame((s: any) => s.marketMult);
  const available = Object.keys(PRODUCTS).filter((p) => warehouse[p] > 0);
  return (
    <div className="panel">
      <h2>Рынок</h2>
      <div className="market-note">
        Настроение рынка: {(marketMult * 100).toFixed(0)}% от базовой цены. Продаёшь — получаешь очко умений.
      </div>
      <div className="cards">
        {available.map((p) => (
          <div className="shop-card" key={p}>
            <div className="sc-name">{PRODUCTS[p].name}</div>
            <div className="inv-qty">{warehouse[p].toFixed(1)} л</div>
            <div className="sc-price">{priceOf(p).toLocaleString('ru')} руб./л</div>
            <button className="btn" onClick={() => sell(p, 1)}>Продать 1 л</button>
            <button className="btn gold" onClick={() => sell(p, warehouse[p])}>Продать всё</button>
          </div>
        ))}
        {available.length === 0 && <div className="sc-desc">Пока нечего продавать — готовь партии!</div>}
      </div>
    </div>
  );
}
