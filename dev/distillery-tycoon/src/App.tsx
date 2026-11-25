import React, { useEffect, useState } from 'react';
import { useGame } from './store/useGame';
import { Production } from './components/Production';
import  SkillTreeRF  from './components/SkillTreeRF';
import { Shop } from './components/Shop';
import { Warehouse } from './components/Warehouse';
import { Market } from './components/Market';
import { UncleTyk } from './components/UncleTyk';
import { EventModal } from './components/EventModal';
import { HeadsCutGame } from './components/HeadsCutGame';

const TABS: [string, string][] = [
  ['prod', 'Производство'],
  ['tree', 'Дерево умений'],
  ['shop', 'Магазин'],
  ['wh', 'Склад'],
  ['mkt', 'Рынок'],
];

export default function App() {
  const [tab, setTab] = useState('prod');
  const autoProgress = useGame((s: any) => s.autoProgress);
  const nextDay = useGame((s: any) => s.nextDay);
  const day = useGame((s: any) => s.day);
  const money = useGame((s: any) => s.money);
  const sp = useGame((s: any) => s.skillPoints);
  const rep = useGame((s: any) => s.reputation);
  const log = useGame((s: any) => s.log);
  const cap = useGame((s: any) => s.capacity);
  const used = useGame((s: any) => s.usedUnits);
  const cu = useGame((s: any) => s.capacityUnits);

  useEffect(() => { autoProgress(); }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="h-title">Самогонщик: Три кита</div>
        <div className="h-stats">
          День {day} · {money.toLocaleString('ru')} руб. · Очки: {sp} · Репутация: {rep.toFixed(1)} · Склад {used()}/{cu()} ед.
        </div>
        <button className="btn-nextday" onClick={() => nextDay()}>Следующий день →</button>
      </header>
      <nav className="tabs">
        {TABS.map(([k, t]) => (
          <button key={k} className={'tab-btn' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{t}</button>
        ))}
      </nav>
      {tab === 'prod' && (
        <div className="prod-layout">
          <UncleTyk />
          <Production />
        </div>
      )}
      {tab === 'tree' && <SkillTreeRF />}
      {tab === 'shop' && <Shop />}
      {tab === 'wh' && <Warehouse />}
      {tab === 'mkt' && <Market />}
      <div className="log-box">
        {log.slice(-8).reverse().map((l: any, i: number) => (
          <div key={i}>День {l.day}: {l.text}</div>
        ))}
      </div>
      <EventModal />
      <HeadsCutGame />
    </div>
  );
}
