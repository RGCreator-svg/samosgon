import { useMemo, useState } from 'react';
import {
  ReactFlow, Background, BackgroundVariant, Panel, MarkerType, Handle, Position,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGame } from '../store/useGame';
import {
  SKILLS, BRANCH_COLORS, BRANCH_NAMES, EXTRA_EDGES,
  canLearn, isVisible, type SkillNode,
} from '../domain/skillTree';

const POS: Record<string, [number, number]> = {
  soc4: [1229, 1135], bk4: [647, 1132], soc3: [1137, 1017], bk3: [741, 1014],
  c4: [1495, 1012], r4: [345, 1000], r3: [483, 908], c3: [1357, 908],
  book: [934, 889], soc2: [1089, 874], bk2: [775, 867], a4: [1579, 840],
  h4: [273, 830], r2: [606, 819], c2: [1223, 804], soc1: [998, 753],
  a3: [1461, 747], bk1: [849, 737], h3: [391, 736], r1: [702, 704],
  c1: [1132, 684], a2: [1349, 647], h2: [509, 642], start: [920, 598],
  th1: [819, 589], a1: [1224, 565], h1: [640, 557], hnd1: [1024, 543],
  d1: [899, 461], fh1: [1392, 460], f1: [740, 444], o1: [1136, 442],
  f2: [603, 356], hnd2: [1036, 329], o2: [1231, 326], d2: [887, 311],
  fm1: [731, 276], o3: [1365, 256], f3: [506, 241], hnd3: [1132, 212],
  d3: [921, 165], dz1: [1264, 141], f4: [391, 138], o4: [1453, 133],
  d4: [782, 80], hnd4: [1138, 58],
};

const ICONS: Record<string, string> = {
  pumpkin: '🎃', grain: '🌾', drop: '💧', star: '⭐', flame: '🔥',
  flask: '⚗️', gear: '⚙️', crystal: '💎', coin: '🪙', handshake: '🤝',
  shop: '🏪', carrot: '🥕', leaf: '🌿', barrel: '🛢️', beer: '🍺',
  bee: '🐝', honey: '🍯',
};

export default function SkillTreeRF() {
  const skills = useGame((s: any) => s.skills);
  const skillPoints = useGame((s: any) => s.skillPoints);
  const learnSkill = useGame((s: any) => s.learnSkill);
  const bookUsed = useGame((s: any) => !!s.bookUsed);
  const [hover, setHover] = useState<SkillNode | null>(null);
  const [resetBranch, setResetBranch] = useState('');

  const visible = useMemo(
    () => SKILLS.filter((n) => isVisible(n, skills)),
    [skills]
  );

  const nodes: Node[] = useMemo(() => visible.map((n) => {
    const [x, y] = POS[n.id] || [n.x, n.y];
    const st = state(n, skills, skillPoints);
    const color = BRANCH_COLORS[n.branch] || '#cfa060';
    const keystone = n.cost >= 4;
    return {
      id: n.id,
      position: { x, y },
      data: { node: n, st, color, keystone },
      draggable: false,
      selectable: false,
      type: 'skill',
    };
  }), [visible, skills, skillPoints]);

  const edges: Edge[] = useMemo(() => {
    const list: Edge[] = [];
    const byId = new Map(SKILLS.map((n) => [n.id, n]));
    const vis = new Set(visible.map((n) => n.id));
    visible.forEach((n) => {
      [...n.requires, ...(n.requiresAny || [])].forEach((r) => {
        if (!byId.has(r) || !vis.has(r)) return;
        list.push({
          id: 'e-' + r + '-' + n.id,
          source: r,
          target: n.id,
          type: 'straight',
          style: {
            stroke: BRANCH_COLORS[byId.get(r)!.branch] || '#cfa060',
            strokeWidth: 2,
            opacity: skills.includes(n.id) ? 0.95 : 0.4,
          },
        //  zIndex: 0,
        });
      });
    });
    EXTRA_EDGES.forEach((pair) => {
      const [a, b] = pair;
      if (vis.has(a) && vis.has(b)) {
        list.push({
          id: 'x-' + a + '-' + b, source: a, target: b, type: 'straight',
          style: { stroke: '#9a8a5a', strokeWidth: 1.5, strokeDasharray: '6 6', opacity: 0.55 },
 //         zIndex: 0,
        });
      }
    });
    const seen = new Set<string>();
    SKILLS.forEach((n) => {
      (n.conflicts || []).forEach((c) => {
        const key = [n.id, c].sort().join('|');
        if (seen.has(key) || !vis.has(n.id) || !vis.has(c)) return;
        seen.add(key);
        const active = skills.includes(n.id) || skills.includes(c);
        list.push({
          id: 'c-' + key, source: n.id, target: c, type: 'straight',
          style: {
            stroke: '#e04040', strokeWidth: active ? 2.5 : 1.5,
            strokeDasharray: '4 5', opacity: active ? 0.95 : 0.4,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#e04040' },
         // zIndex: 1,
        });
      });
    });
    return list;
  }, [visible, skills]);

  const doReset = () => {
    if (!resetBranch || bookUsed) return;
    const s = useGame.getState() as any;
    const removed = s.skills.filter((id: string) =>
      SKILLS.find((n) => n.id === id)?.branch === resetBranch
    );
    const refund = removed.reduce(
      (sum: number, id: string) => sum + (SKILLS.find((n) => n.id === id)?.cost || 0), 0
    );
    const keep = s.skills.filter((id: string) =>
      SKILLS.find((n) => n.id === id)?.branch !== resetBranch
    );
    useGame.setState({
      skills: keep,
      skillPoints: s.skillPoints + refund,
      bookUsed: true,
    });
    s.say('КНИГА ТЫКА: ВЕТКА «' + BRANCH_NAMES[resetBranch] + '» СБРОШЕНА, ВОЗВРАЩЕНО ' + refund + ' ОЧКОВ.');
    setResetBranch('');
  };

  return (
    <div style={wrap}>
      <style>{css}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ skill: SkillCircle }}
        onNodeMouseEnter={(_, p: any) => setHover(p.data.node)}
        onNodeMouseLeave={() => setHover(null)}
        onNodeClick={(_, p: any) => {
          const n = p.data.node as SkillNode;
          const st = state(n, skills, skillPoints);
          if (st === 'affordable') learnSkill(n.id);
          else if (st === 'expensive') {
            (useGame.getState() as any).say('МАЛО ОЧКОВ УМЕНИЙ — ПРОДАВАЙ БОЛЬШЕ ПРОДУКЦИИ!');
          }
        }}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.3}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={2} color="#6b573a" />
        <Panel position="top-left">
          <div className="skrf-points">ОЧКИ УМЕНИЙ: {skillPoints}</div>
        </Panel>
        <Panel position="top-right">
          {skills.includes('book') && !bookUsed && (
            <div className="skrf-book">
              <select value={resetBranch} onChange={(e) => setResetBranch(e.target.value)}>
                <option value="">— выбери ветку —</option>
                {Object.entries(BRANCH_NAMES)
                  .filter((pair) => pair[0] !== 'start')
                  .map((pair) => <option key={pair[0]} value={pair[0]}>{pair[1]}</option>)}
              </select>
              <button disabled={!resetBranch} onClick={doReset}>Сбросить (Книга Тыка)</button>
            </div>
          )}
        </Panel>
        <Panel position="bottom-right">
          <div className="skrf-legend">
            <span><i style={{ background: 'radial-gradient(circle, #ffd977, #b8860b)' }} /> изучено</span>
            <span><i className="pulse" /> доступно</span>
            <span><i style={{ opacity: 0.35 }} /> заблокировано</span>
            <span><i className="conf" /> конфликт</span>
          </div>
        </Panel>
        <Panel position="bottom-left">
          {hover && (
            <div className="skrf-tip">
              <div className="tip-name" style={{ color: BRANCH_COLORS[hover.branch] }}>
                {ICONS[hover.icon]} {hover.name}
              </div>
              <div className="tip-branch">{BRANCH_NAMES[hover.branch]} · цена: {hover.cost} очк.</div>
              <div className="tip-desc">{hover.desc}</div>
              {hover.conflicts && (
                <div className="tip-conf">
                  Конфликтует: {hover.conflicts.map((c) => SKILLS.find((n) => n.id === c)?.name).join(', ')}
                </div>
              )}
              {hover.unlockHint && <div className="tip-hint">{hover.unlockHint}</div>}
            </div>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}

function state(n: SkillNode, skills: string[], points: number): string {
  if (skills.includes(n.id)) return 'learned';
  if (canLearn(n, skills)) return points >= n.cost ? 'affordable' : 'expensive';
  return 'locked';
}

function SkillCircle({ data }: any) {
  const node = data.node as SkillNode;
  const st: string = data.st;
  const color: string = data.color;
  const keystone: boolean = data.keystone;
  const centerHandle: React.CSSProperties = {
    left: '50%', top: '50%', width: 2, height: 2, minWidth: 0, minHeight: 0,
    transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none',
    background: 'transparent', border: 'none',
  };
  return (
    <div className={'skc skc-' + st + (keystone ? ' skc-key' : '')} title={node.name}>
      <div className="skc-ring" style={{ borderColor: color }}>
        <Handle type="target" position={Position.Top} style={centerHandle} />
        <span className="skc-ico">{ICONS[node.icon] || '⭐'}</span>
        {node.cost > 0 && <span className="skc-cost">{node.cost}</span>}
        <Handle type="source" position={Position.Bottom} style={centerHandle} />
      </div>
      <div className="skc-label">{node.name}</div>
    </div>
  );
}


const wrap: any = {
  width: '100%',
  height: 'calc(100vh - 130px)',
  minHeight: '560px',
  background: 'radial-gradient(ellipse at 50% 42%, #2c2440 0%, #191430 55%, #100c20 100%)',
  position: 'relative',
};

const css = `
.skrf-points {
  background: rgba(20,14,8,.82); color: #ffd977; font-weight: 700;
  border: 1px solid #8a6a1e; border-radius: 8px; padding: 6px 12px; font-size: 14px;
}
.skrf-book { display: flex; gap: 6px; align-items: center; }
.skrf-book select {
  background: rgba(20,14,8,.85); color: #ffd977; border: 1px solid #8a6a1e;
  border-radius: 6px; padding: 4px 8px; font-size: 13px;
}
.skrf-book button {
  background: linear-gradient(180deg, #e8c86a, #c99a3a); color: #2a1c08;
  border: 1px solid #8a6a1e; border-radius: 6px; padding: 4px 10px;
  font-weight: 700; cursor: pointer; font-size: 13px;
}
.skrf-book button:disabled { opacity: .4; cursor: default; }
.skrf-legend {
  display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #e8dcbf;
  background: rgba(20,14,8,.72); padding: 8px 10px; border-radius: 8px;
  border: 1px solid rgba(138,106,30,.5);
}
.skrf-legend span { display: flex; align-items: center; gap: 6px; }
.skrf-legend i { width: 14px; height: 14px; border-radius: 50%; display: inline-block;
  background: rgba(255,255,255,.14); border: 1px solid #9a8a5a; }
.skrf-legend i.pulse { border: 2px solid #ffd977; }
.skrf-legend i.conf { border: 1.5px dashed #e04040; background: transparent; }
.skrf-tip {
  background: rgba(24,17,9,.94); border: 1px solid #8a6a1e; border-radius: 10px;
  padding: 10px 14px; max-width: 320px; color: #f0e6cf; font-size: 13px; line-height: 1.45;
}
.tip-name { font-weight: 700; font-size: 15px; }
.tip-branch { color: #b8a880; font-size: 12px; margin: 2px 0 6px; }
.tip-conf { color: #ff8a80; font-size: 12px; margin-top: 6px; }
.tip-hint { color: #ffd977; font-size: 12px; margin-top: 6px; font-style: italic; }
.skc { width: 110px; text-align: center; cursor: pointer; }
.skc-ring {
  width: 84px; height: 84px; margin: 0 auto; border-radius: 50%;
  border: 2px solid; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 38% 32%, #4a3c22, #241b0e 78%);
  box-shadow: 0 4px 14px rgba(0,0,0,.55); position: relative;
  transition: transform .15s ease, box-shadow .15s ease;
}
.skc-ico { font-size: 30px; filter: drop-shadow(0 2px 2px rgba(0,0,0,.6)); }
.skc-cost {
  position: absolute; bottom: -4px; right: -2px; background: #1c150a;
  border: 1px solid #8a6a1e; color: #ffd977; border-radius: 50%;
  width: 22px; height: 22px; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.skc-label {
  margin-top: 5px; font-size: 11.5px; color: #f0e6cf; line-height: 1.2;
  text-shadow: 0 1px 3px #000, 0 0 6px rgba(0,0,0,.9); font-weight: 600;
}
.skc-learned .skc-ring {
  background: radial-gradient(circle at 38% 32%, #e8c05a, #9a6a12 78%);
  border-width: 3px; box-shadow: 0 0 16px rgba(255,215,120,.55), 0 4px 14px rgba(0,0,0,.55);
}
.skc-learned .skc-ico { filter: drop-shadow(0 1px 2px rgba(0,0,0,.7)); transform: scale(1.08); }
.skc-learned .skc-label { color: #ffe9a8; }

.skc-affordable .skc-ring {
  border-width: 3px; animation: skc-pulse 1.6s ease-in-out infinite;
}
.skc-affordable:hover .skc-ring, .skc-learned:hover .skc-ring { transform: scale(1.1); }
.skc-expensive .skc-ring { border-style: dashed; }
.skc-locked { cursor: default; }
.skc-locked .skc-ring {
  background: radial-gradient(circle at 38% 32%, #3a3a40, #1c1c22 78%);
  border-width: 2px; border-color: #6a6a72 !important;
  box-shadow: none;
}

.skc-locked .skc-ico {
  filter: grayscale(1) brightness(.7) drop-shadow(0 2px 2px rgba(0,0,0,.6));
}
.skc-locked .skc-cost { opacity: .55; }
.skc-locked .skc-label { color: #9a8f78; }

.skc-key .skc-ring { border-width: 3px; }
.skc-key .skc-ico { font-size: 34px; }
@keyframes skc-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(255,217,119,.35), 0 4px 14px rgba(0,0,0,.55); }
  50% { box-shadow: 0 0 20px rgba(255,217,119,.8), 0 4px 14px rgba(0,0,0,.55); }
}
`;

export { SkillTreeRF };
