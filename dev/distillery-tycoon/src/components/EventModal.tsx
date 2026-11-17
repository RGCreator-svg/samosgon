import React from 'react';
import { useGame } from '../store/useGame';
import { EVENTS } from '../domain/events';

export function EventModal() {
  const pending = useGame((s: any) => s.pendingEvent);
  const resolve = useGame((s: any) => s.resolveEvent);
  if (!pending) return null;
  const ev = EVENTS.find((e) => e.id === pending);
  if (!ev) return null;
  return (
    <div className="overlay">
      <div className="modal">
        <h3>{ev.title}</h3>
        <div className="ev-desc">{ev.desc}</div>
        {ev.options.map((o, i) => (
          <button key={i} className="btn ev-opt" onClick={() => resolve(i)}>{o.text}</button>
        ))}
      </div>
    </div>
  );
}
