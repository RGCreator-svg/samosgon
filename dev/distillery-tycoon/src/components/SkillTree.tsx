import React, { useState } from 'react';
import { useGame } from '../store/useGame';
import { SKILLS, EXTRA_EDGES, BRANCH_COLORS, canLearn, SkillNode } from '../domain/skillTree';
import { ICONS } from '../assets/icons';

export function SkillTree() {
  const skills = useGame((s: any) => s.skills);
  const points = useGame((s: any) => s.skillPoints);
  const learn = useGame((s: any) => s.learnSkill);
  const [sel, setSel] = useState<string | null>(null);

  const node = SKILLS.find((n) => n.id === sel);
  const byId = (id: string) => SKILLS.find((n) => n.id === id)!;
  const R = { 0: 22, 1: 16, 2: 20, 3: 26 } as any;

  return (
    <div className="tree-wrap">
      <img src="/src/assets/bg.png" className="tree-bg" alt="" />
      <svg className="tree-svg" viewBox="0 0 1600 1000">
        {SKILLS.flatMap((n) =>
          n.requires.map((r) => {
            const a = byId(r);
            const active = skills.includes(r) && skills.includes(n.id);
            return (
              <line key={r + n.id} x1={a.x} y1={a.y} x2={n.x} y2={n.y}
                className={'edge' + (active ? ' active' : '')} />
            );
          })
        )}
        {EXTRA_EDGES.map(([a, b]) => {
          const na = byId(a); const nb = byId(b);
          const active = skills.includes(a) && skills.includes(b);
          return (
            <line key={a + b} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              className={'edge' + (active ? ' active' : '')} strokeDasharray="7 5" />
          );
        })}
        {SKILLS.map((n) => {
          const learned = skills.includes(n.id);
          const available = canLearn(n, skills);
          const cls = 'node' + (learned ? '' : available ? ' available' : ' locked');
          const r = R[n.cost];
          return (
            <g key={n.id} className={cls} onClick={() => setSel(n.id)}>
              <circle cx={n.x} cy={n.y} r={r + 6} fill="rgba(20,18,30,.75)" />
              <defs>
                <clipPath id={'c' + n.id}>
                  <circle cx={n.x} cy={n.y} r={r} />
                </clipPath>
              </defs>
              <image href={ICONS[n.icon]} x={n.x - r} y={n.y - r} width={2 * r} height={2 * r}
                clipPath={'url(#c' + n.id + ')'} />
              <circle className="body" cx={n.x} cy={n.y} r={r} fill="none"
                stroke={learned ? BRANCH_COLORS[n.branch] : '#5a4a28'} />
              <text className="node-label" x={n.x} y={n.y + r + 16}>{n.name}</text>
            </g>
          );
        })}
      </svg>
      {node && (
        <div className="node-card">
          <div className="nc-name">{node.name} ({node.cost} очк.)</div>
          <div className="nc-desc">{node.desc}</div>
          {skills.includes(node.id) ? (
            <span style={{ color: '#7ec850' }}>Изучено</span>
          ) : (
            <button className="btn gold" onClick={() => learn(node.id)}>Изучить</button>
          )}
          <span style={{ marginLeft: 12, color: '#cbb98d', fontSize: 13 }}>Доступно очков: {points}</span>
        </div>
      )}
    </div>
  );
}
