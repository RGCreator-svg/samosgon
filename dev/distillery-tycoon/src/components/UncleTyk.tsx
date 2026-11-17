import React from 'react';
import uncle from '../assets/uncle.png';
import { useGame } from '../store/useGame';

export function UncleTyk() {
  const log = useGame((s: any) => s.log);
  const last = log[log.length - 1];
  const text = last ? last.text.replace('ДЯДЮШКА ТЫК: ', '') : '';
  return (
    <div className="uncle-panel">
      <img src={uncle} className="uncle-img" alt="Дядюшка Тык" />
      <div className="uncle-speech">{text}</div>
    </div>
  );
}
