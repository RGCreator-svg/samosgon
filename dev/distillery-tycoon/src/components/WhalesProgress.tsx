import React from "react";
import { useGame } from "../store/useGame";
import "./WhalesProgress.css";

/**
 * Лента этапов «Три кита»: Приготовление браги → Разделение → Улучшение.
 * Состояния: locked (серый, замок) / active (золотой пульс) / done (зелёная галочка).
 */
export function WhalesProgress() {
  const warehouse = useGame((s: any) => s.warehouse) || {};
  const batches   = useGame((s: any) => s.batches) || [];
  const skills    = useGame((s: any) => s.skills) || [];
  const equipment = useGame((s: any) => s.equipment) || [];

  const w = (id: string) => warehouse[id] || 0;

  const brewing = batches.filter((b: any) => !b.ready).length;
  const ready   = batches.filter((b: any) => b.ready).length;
  const rawTotal = w("raw-sugar") + w("raw-fruit") + w("raw-veg");
  const stage1Done = ready > 0 || rawTotal > 0;

  const hasApparatus = equipment.some((e: string) =>
    ["dimka", "apparatus", "tyk-pro", "cube"].some((p) => e.includes(p))
  );
  const stage2Locked = !stage1Done && !hasApparatus;
  const stage2Done = rawTotal > 0;

  const parts = ["tsarga", "packing", "dephl", "node"];
  const hasColumn = equipment.filter((e: string) => parts.some((p) => e.startsWith(p))).length >= 4;
  const hasBarrel = equipment.includes("barrel-oak") || equipment.includes("barrel-france");
  const stage3Locked = !hasColumn && !hasBarrel;
  const producedTotal =
    w("rectified") + w("aged") + w("tincture") + w("ale") + w("lager") + w("mead") + w("cider");
  const stage3Done = producedTotal > 0;

  const stateOf = (locked: boolean, done: boolean) =>
    done ? "done" : locked ? "locked" : "active";

  const s1 = stateOf(false, stage1Done);
  const s2 = stateOf(stage2Locked, stage2Done);
  const s3 = stateOf(stage3Locked, stage3Done);

  return (
    <div className="whales-track">
      <div className={`whale-card ${s1}`}>
        <div className="wc-badge">{s1 === "done" ? "✓" : s1 === "locked" ? "🔒" : "•"}</div>
        <div className="wc-title">Приготовление браги</div>
        <div className="wc-status">Бродит: {brewing} · Готовы: {ready}</div>
      </div>
      <div className="whale-arrow">→</div>
      <div className={`whale-card ${s2}`}>
        <div className="wc-badge">{s2 === "done" ? "✓" : s2 === "locked" ? "🔒" : "•"}</div>
        <div className="wc-title">Разделение</div>
        <div className="wc-status">Сырца на складе: {rawTotal.toFixed(1)} л</div>
      </div>
      <div className="whale-arrow">→</div>
      <div className={`whale-card ${s3}`}>
        <div className="wc-badge">{s3 === "done" ? "✓" : s3 === "locked" ? "🔒" : "•"}</div>
        <div className="wc-title">Улучшение</div>
        <div className="wc-status">Готовой продукции: {producedTotal.toFixed(1)} л</div>
      </div>
    </div>
  );
}
