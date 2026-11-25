import React from 'react';
import { useGame } from '../store/useGame';
import { SHOP } from '../domain/catalog';

const SECTIONS: [string, string][] = [
  ['column', 'Ректификационная колонна'],
  ['distill', 'Перегонка'],
  ['brew', 'Пивоварня'],
  ['provision', 'Провизия'],
  ['build', 'Стройка склада'],
];

export function Shop() {
  const money = useGame((s: any) => s.money);
  const buy = useGame((s: any) => s.buy);
  const equipment = useGame((s: any) => s.equipment);
  const constructions = useGame((s: any) => s.constructions);
  return (
    <div className="panel">
      <h2>Онлайн-магазин «У Тыка с доставкой»</h2>
      {SECTIONS.map(([key, title]) => (
        <section key={key}>
          <h3>{title}</h3>
          <div className="cards">
            {SHOP.filter((e) => e.section === key).map((e) => {
              const owned = equipment.includes(e.id) || constructions.includes(e.id);
              return (
                <div className={'shop-card q' + e.quality} key={e.id}>
                  <div className="q-stars">{'✦'.repeat(e.quality || 1)}</div>
                  <div className="sc-name">{e.name}</div>
                  <div className="sc-desc">{e.desc}</div>
                  <div className="sc-price">{e.price.toLocaleString('ru')} руб.</div>
                  <button className="btn" disabled={owned || money < e.price} onClick={() => buy(e.id)}>
                    {owned ? 'Куплено' : 'Купить'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
