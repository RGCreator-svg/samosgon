import React, { useMemo, useCallback, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SKILLS, BRANCH_COLORS, BRANCH_NAMES, canLearn, isVisible } from "../domain/skillTree";
import type { SkillNode } from "../domain/skillTree";
import { useGame } from "../store/useGame";
import "./SkillTreeRF.css";

const nodeById = (id: string): SkillNode | undefined =>
  SKILLS.find((n) => n.id === id);

type SkillCardData = {
  skill: SkillNode;
  state: "learned" | "available" | "locked";
};

const ICON_MAP: Record<string, string> = {
  pumpkin: "🎃", grain: "🌾", drop: "💧", star: "⭐", flame: "🔥",
  flask: "⚗️", gear: "⚙️", crystal: "💎", coin: "🪙", handshake: "🤝",
  shop: "🏪", carrot: "🥕", leaf: "🌿", barrel: "🛢️", beer: "🍺",
  bee: "🐝", honey: "🍯",
};

function SkillCard({ data }: NodeProps) {
  const d = data as unknown as SkillCardData;
  const { skill, state } = d;
  const color = BRANCH_COLORS[skill.branch] ?? "#999";
  const tooltip =
    skill.desc +
    (skill.conflicts?.length
      ? `\nНесовместим с: ${skill.conflicts.map((c) => nodeById(c)?.name ?? c).join(", ")}`
      : "") +
    (skill.unlockHint ? `\n${skill.unlockHint}` : "");
  return (
    <div
      className={`skrf-card skrf-${state}`}
      style={{ ["--branch-color" as any]: color }}
      title={tooltip}
    >
      <div className="skrf-icon">{ICON_MAP[skill.icon] ?? "•"}</div>
      <div className="skrf-name">{skill.name}</div>
      <div className="skrf-cost">{skill.cost ? `${skill.cost} оч.` : "база"}</div>
      {state === "locked" && <div className="skrf-lock">🔒</div>}
      {state === "learned" && <div className="skrf-check">✓</div>}
    </div>
  );
}

const nodeTypes = { skillCard: SkillCard };

// ---------- Раскладка: масштаб + расталкивание наложений ----------
const SX = 2.2;   // масштаб по горизонтали
const SY = 1.6;   // масштаб по вертикали
const MIN_W = 180; // минимальный зазор по X (ширина карточки ~150px)
const MIN_H = 95;  // минимальный зазор по Y (высота карточки ~80px)

type Pt = { id: string; x: number; y: number };

function spreadLayout(ids: string[]): Map<string, Pt> {
  const pts: Pt[] = ids.map((id) => {
    const n = SKILLS.find((s) => s.id === id)!;
    return { id, x: n.x * SX, y: n.y * SY };
  });
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (adx < MIN_W && ady < MIN_H) {
          if (adx <= ady) {
            const push = (MIN_W - adx) / 2 + 2;
            const sign = Math.sign(dx) || (a.x <= b.x ? 1 : -1);
            a.x -= sign * push;
            b.x += sign * push;
          } else {
            const push = (MIN_H - ady) / 2 + 2;
            const sign = Math.sign(dy) || 1;
            a.y -= sign * push;
            b.y += sign * push;
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return new Map(pts.map((p) => [p.id, p]));
}

export function SkillTreeRF() {
  const learned: string[] = useGame((s: any) => s.skills) || [];
  const points: number = useGame((s: any) => s.skillPoints) || 0;
  const learn: ((id: string) => void) | undefined = useGame((s: any) => s.learnSkill);
  const resetBranch = useGame((s: any) => s.resetBranch);
  const resetUsed = useGame((s: any) => s.resetUsed);
  const [, setTick] = useState(0);

  const visibleSkills = useMemo(
    () => SKILLS.filter((n) => isVisible(n, learned)),
    [learned]
  );

  const positions = useMemo(
    () => spreadLayout(visibleSkills.map((n) => n.id)),
    [visibleSkills]
  );

  const nodes: Node[] = useMemo(
    () =>
      visibleSkills.map((n) => {
        const pos = positions.get(n.id) ?? { x: n.x * SX, y: n.y * SY };
        return {
          id: n.id,
          type: "skillCard",
          position: { x: pos.x, y: pos.y },
          data: {
            skill: n,
            state: learned.includes(n.id)
              ? "learned"
              : canLearn(n, learned)
              ? "available"
              : "locked",
          } as SkillCardData,
        };
      }),
    [visibleSkills, learned, positions]
  );

  const edges: Edge[] = useMemo(() => {
    const list: Edge[] = [];
    visibleSkills.forEach((n) => {
      n.requires.forEach((p) => {
        if (!nodeById(p)) return;
        list.push({
          id: `e-${p}-${n.id}`,
          source: p,
          target: n.id,
          type: "smoothstep",
          style: { stroke: "#a08a5a", strokeWidth: 2 },
        });
      });
    });
    // Конфликты — красный пунктир между взаимоисключающими кейстоунами
    SKILLS.forEach((n) =>
      n.conflicts?.forEach((c) => {
        if (c > n.id) return; // рисуем пару один раз
        list.push({
          id: `conf-${n.id}-${c}`,
          source: n.id,
          target: c,
          type: "straight",
          style: { stroke: "#d32f2f", strokeWidth: 2, strokeDasharray: "6 4" },
          label: "конфликт",
          labelStyle: { fill: "#d32f2f", fontSize: 11 },
        });
      })
    );
    return list;
  }, [visibleSkills]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const skill = (node.data as unknown as SkillCardData).skill;
      if (!skill || learned.includes(skill.id) || !canLearn(skill, learned)) return;
      if (skill.cost > points) return;
      if (!learn) return;
      learn(skill.id);
      setTick((t) => t + 1);
    },
    [learned, points, learn]
  );

  const bookReady = learned.includes("book") && !resetUsed;
  const resetCandidates = useMemo(() => {
    const branches = new Set<string>();
    SKILLS.filter((n) => n.branch !== "start" && learned.includes(n.id)).forEach(
      (n) => branches.add(n.branch)
    );
    return Array.from(branches);
  }, [learned]);

  return (
    <div className="skrf-wrap">
      <div className="skrf-header">
        Очки умений: <b>{points}</b> · Изучено узлов: <b>{learned.length}</b>/{SKILLS.length}
        {bookReady && (
          <span className="skrf-book">
            {" "}· Книга Тыка: сбросить{" "}
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value && resetBranch) resetBranch(e.target.value);
              }}
            >
              <option value="" disabled>ветку…</option>
              {resetCandidates.map((b) => (
                <option key={b} value={b}>{BRANCH_NAMES[b] ?? b}</option>
              ))}
            </select>
          </span>
        )}
      </div>
      <div className="skrf-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.3}
            maxZoom={1.6}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1.5} color="#c9b98a" />
            <Controls />
            <MiniMap
              nodeColor={(n) => BRANCH_COLORS[(n.data as unknown as SkillCardData)?.skill?.branch] ?? "#999"}
              maskColor="rgba(240, 234, 214, 0.75)"
              pannable
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <div className="skrf-legend">
        <span>✓ изучено</span>
        <span>● доступно (пульсирует)</span>
        <span>🔒 заблокировано</span>
        <span style={{ color: "#d32f2f" }}>— красный пунктир: конфликт</span>
      </div>
    </div>
  );
}
