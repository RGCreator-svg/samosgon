import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../store/useGame';

export function HeadsCutGame() {
  const pending = useGame((s: any) => s.pendingHeads);
  const cut = useGame((s: any) => s.cutHeads);
  const [pct, setPct] = useState(8);
  const [t, setT] = useState(10);
  const done = useRef(false);

  useEffect(() => {
    if (!pending) return;
    done.current = false;
    setPct(8); setT(10);
  }, [pending]);

  useEffect(() => {
    if (!pending || done.current) return;
    const iv = setInterval(() => {
      setT((x) => {
        if (x <= 1) {
          clearInterval(iv);
          if (!done.current) { done.current = true; cut(8); }
          return 0;
        }
        return x - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [pending, cut]);

  if (!pending) return null;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    cut(pct);
  };

  return (
    <div className="overlay">
      <div className="modal">
        <h3>Отсечение голов!</h3>
        <div className="ev-desc">Дядюшка Тык смотрит на термометр. Чем больше отсечёшь — тем чище, но тем меньше выйдет.</div>
        <div className="hc-timer">{t > 0 ? 'Осталось: ' + t + ' сек' : 'Время вышло!'}</div>
        <input type="range" min={0} max={15} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
        <div className="ev-desc">Отсечение: {pct}% (безопасно: 4–10%)</div>
        <button className="btn gold" onClick={finish}>Подтвердить</button>
      </div>
    </div>
  );
}
