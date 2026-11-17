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
import { SKILLS, BRANCH_COLORS, canLearn, isVisible } from "../domain/skillTree";
import type { SkillNode } from "../domain/skillTree";
import { useGame } from "../store/useGame";
import "./SkillTreeRF.css";

// ⚠️ Проверь имена полей стора: skills, skillPoints, learnSkill
// Подставь реальные, если в твоём useGame они называются иначе.

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

export function SkillTreeRF() {
  const learned: string[] = useGame((s: any) => s.skills) || [];
  const points: number = useGame((s: any) => s.skillPoints) || 0;
  const learn: ((id: string) => void) | undefined = useGame((s: any) => s.learnSkill);
  const [, setTick] = useState(0);

  const visibleSkills = useMemo(
    () => SKILLS.filter((n) => isVisible(n, learned)),
    [learned]
  );

  const nodes: Node[] = useMemo(
    () =>
      visibleSkills.map((n) => ({
        id: n.id,
        type: "skillCard",
        position: { x: n.x, y: n.y },
        data: {
          skill: n,
          state: learned.includes(n.id)
            ? "learned"
            : canLearn(n, learned)
            ? "available"
            : "locked",
        } as SkillCardData,
      })),
    [visibleSkills, learned]
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

  return (
    <div className="skrf-wrap">
      <div className="skrf-header">
        Очки умений: <b>{points}</b> · Изучено узлов: <b>{learned.length}</b>/{SKILLS.length}
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
