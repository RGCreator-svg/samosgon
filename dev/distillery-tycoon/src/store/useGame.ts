import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHOP, RECIPES, PRODUCTS, PRODUCTS_BY_ID } from '../domain/catalog';
import { SKILLS, bonuses, canLearn, Bonuses } from '../domain/skillTree';
import { EVENTS, EventOption } from '../domain/events';

export interface Batch {
  id: string;
  recipeId: string;
  daysLeft: number;
  ready: boolean;
}

interface LogEntry { day: number; text: string; }

const RAW_IDS = ['raw-sugar', 'raw-fruit', 'raw-veg'];
let bidCounter = 1;

export const useGame = create<any>()(
  persist(
    (set: any, get: any) => ({
      day: 1,
      money: 30000,
      lastVisit: Date.now(),
      skillPoints: 2,
      skills: ['start'],
      warehouse: { sugar: 20, yeast: 3 } as Record<string, number>,
      equipment: [] as string[],
      constructions: [] as string[],
      batches: [] as Batch[],
      reputation: 0,
      marketMult: 1,
      eventCooldown: 2,
      pendingEvent: null as string | null,
      pendingHeads: null as string | null,
      resetUsed: false,
      log: [{ day: 1, text: 'ДЯДЮШКА ТЫК: ДОБРО ПОЖАЛОВАТЬ НА ЗАВОДСКОЙ ДВОР!' }] as LogEntry[],

      say(text: string) {
        set((s: any) => ({ log: [...s.log.slice(-40), { day: s.day, text }] }));
      },

      capacity(): number {
        const s = get();
        let cap = 20;
        let mult = 1;
        s.constructions.forEach((id: string) => {
          const it = SHOP.find((x) => x.id === id);
          if (it && it.storageBonus) cap += it.storageBonus;
          if (it && it.storageMultiplier) mult *= it.storageMultiplier;
        });
        return Math.floor(cap * mult);
      },
      capacityUnits(): number { return get().capacity() * 5; },
      usedUnits(): number {
        const w = get().warehouse;
        let u = 0;
        Object.keys(w).forEach((k) => { u += w[k] || 0; });
        return u;
      },

      addItem(id: string, qty: number) {
        const s = get();
        const space = s.capacityUnits() - s.usedUnits();
        const fit = Math.max(0, Math.min(qty, space));
        if (fit <= 0) {
          s.say('СКЛАД ПОЛОН — ВСЁ ПРОПАЛО! РАСШИРЬ СКЛАД В МАГАЗИНЕ.');
          return;
        }
        if (fit < qty) s.say('СКЛАД ПОЛОН — ЧАСТЬ УРОЖАЯ ПОГИБЛА!');
        set({ warehouse: { ...s.warehouse, [id]: (s.warehouse[id] || 0) + fit } });
      },

      buy(id: string) {
        const s = get();
        const it = SHOP.find((x) => x.id === id);
        if (!it) return;
        if (s.equipment.includes(id) || s.constructions.includes(id)) { s.say('УЖЕ КУПЛЕНО.'); return; }
        const price = it.section === 'provision'
          ? Math.round(it.price * (1 - bonuses(s.skills).discount))
          : it.price;
        if (s.money < price) { s.say('ДЕНЕГ НЕ ХВАТАЕТ: НУЖНО ' + price + ' РУБ.'); return; }
        if (it.material) {
          const qty = it.qty || 0;
          if (s.usedUnits() + qty > s.capacityUnits()) {
            s.say('СКЛАД ПОЛОН — РАСШИРЬ ЕГО В РАЗДЕЛЕ «СТРОЙКА СКЛАДА».');
            return;
          }
          set({ money: s.money - price });
          get().addItem(it.material, qty);
          s.say('КУПЛЕНО И ДОСТАВЛЕНО НА СКЛАД: ' + it.name.toUpperCase() + '.');
          return;
        }
        if (it.storageBonus || it.storageMultiplier) {
          set({ money: s.money - price, constructions: [...s.constructions, id] });
        } else {
          set({ money: s.money - price, equipment: [...s.equipment, id] });
        }
        s.say('КУПЛЕНО И УСТАНОВЛЕНО: ' + it.name.toUpperCase() + '.');
      },

      learnSkill(id: string) {
        const s = get();
        const node = SKILLS.find((n) => n.id === id);
        if (!node || s.skills.includes(id)) return;
        if (!canLearn(node, s.skills)) { s.say('СНАЧАЛА НУЖНЫ ПРЕДЫДУЩИЕ УЗЛЫ ВЕТКИ!'); return; }
        if (node.conflicts && node.conflicts.some((c) => s.skills.includes(c))) {
          s.say('ЭТА ВЕТКА КОНФЛИКТУЕТ С УЖЕ ИЗУЧЕННОЙ! ВЫБИРАЙ.');
          return;
        }
        if (s.skillPoints < node.cost) { s.say('МАЛО ОЧКОВ УМЕНИЙ — ПРОДАВАЙ БОЛЬШЕ!'); return; }
        set({ skills: [...s.skills, id], skillPoints: s.skillPoints - node.cost });
        s.say('ИЗУЧЕНО: ' + node.name.toUpperCase() + '!');
      },

      resetBranch(branch: string) {
        const s = get();
        const bn = bonuses(s.skills);
        if (!bn.resetOnce || s.resetUsed) { s.say('КНИГА ТЫКА УЖЕ ИСПОЛЬЗОВАНА!'); return; }
        const ids = SKILLS.filter((n) => n.branch === branch && s.skills.includes(n.id)).map((n) => n.id);
        if (ids.length === 0) { s.say('В ЭТОЙ ВЕТКЕ НЕЧЕГО СБРАСЫВАТЬ.'); return; }
        const refunded = ids.reduce((a, id) => a + (SKILLS.find((n) => n.id === id)?.cost || 0), 0);
        set({
          skills: s.skills.filter((id: string) => !ids.includes(id)),
          skillPoints: s.skillPoints + refunded,
          resetUsed: true,
        });
        s.say('КНИГА ТЫКА: ВЕТКА «' + branch.toUpperCase() + '» СБРОШЕНА, ВОЗВРАЩЕНО ' + refunded + ' ОЧКОВ.');
      },

      startBatch(recipeId: string) {
        const s = get();
        const r = RECIPES.find((x) => x.id === recipeId);
        if (!r) return;
        const bn: Bonuses = bonuses(s.skills);
        if (r.needs === 'mead' && !bn.mead) { s.say('МЕДОВУХА НЕ ОТКРЫТА — УЧИ ПАСЕКУ!'); return; }
        if (r.needs === 'cider' && !bn.cider) { s.say('СИДР НЕ ОТКРЫТ — САД ЖДЁТ!'); return; }
        if (r.needs === 'tinct' && !bn.tinct) { s.say('НАСТОЙКИ НЕ ОТКРЫТЫ — УЧИ ТРАВЫ!'); return; }
        if (r.needs === 'brewery' && !s.equipment.includes('brew-kettle')) { s.say('НУЖНА ПИВОВАРНЯ — КУПИ КОТ В МАГАЗИНЕ!'); return; }
        if (s.batches.length >= 4) { s.say('ВСЁ ЗАЛЯТО — БОЛЬШЕ ЧАНОВ НЕТ.'); return; }
        // «any-raw»: подходит любой дистиллят-сырец
        const need = { ...r.inputs } as Record<string, number>;
        if (need['any-raw']) {
          const total = RAW_IDS.reduce((a, id) => a + (s.warehouse[id] || 0), 0);
          if (total < need['any-raw']) { s.say('НЕ ХВАТАЕТ ДИСТИЛЛЯТА-СЫРЦА НА СКЛАДЕ!'); return; }
          delete need['any-raw'];
        }
        const w = { ...s.warehouse };
        if (r.inputs['any-raw']) {
          let rest = r.inputs['any-raw'];
          for (const id of RAW_IDS) {
            const take = Math.min(w[id] || 0, rest);
            w[id] = (w[id] || 0) - take;
            if (w[id] <= 0) delete w[id];
            rest -= take;
            if (rest <= 0) break;
          }
        }
        let ok = true;
        Object.keys(need).forEach((k) => { if ((w[k] || 0) < need[k]) ok = false; });
        if (!ok) { s.say('НЕ ХВАТАЕТ СЫРЬЯ НА СКЛАДЕ!'); return; }
        Object.keys(need).forEach((k) => {
          w[k] = (w[k] || 0) - need[k];
          if (w[k] <= 0) delete w[k];
        });
        const faster = ['mash', 'fruit', 'veg'].includes(r.kind) ? Math.max(1, r.days - bn.brewSpeed) : r.days;
        set({
          warehouse: w,
          batches: [...s.batches, { id: 'b' + bidCounter++ + '_' + s.day, recipeId, daysLeft: faster, ready: false }],
        });
        s.say('ПОСТАВЛЕНА ПАРТИЯ: ' + r.name.toUpperCase());
      },

      distill(batchId: string) {
        const s = get();
        const b = s.batches.find((x: Batch) => x.id === batchId);
        if (!b || !b.ready) return;
        set({ pendingHeads: batchId });
      },

      cutHeads(pct: number) {
        const s = get();
        if (!s.pendingHeads) return;
        const b = s.batches.find((x: Batch) => x.id === s.pendingHeads);
        if (!b) { set({ pendingHeads: null }); return; }
        const r = RECIPES.find((x) => x.id === b.recipeId)!;
        const bn = bonuses(s.skills);
        let eff = Math.max(0, pct - bn.headsSoft - bn.handsZone * 10);
        let perfect = false;
        if (Math.random() < bn.perfectChance) { eff = 0; perfect = true; }
        const appQ = s.bestQuality(['dimka-2', 'apparatus-pure', 'tyk-pro']) || 1;
        const yieldL = Math.max(0.5, Math.round(r.liters * (0.65 - eff * 0.01) * (1 + bn.yield) * (1 + 0.06 * (appQ - 1)) * 10) / 10);
        set({ pendingHeads: null, batches: s.batches.filter((x: Batch) => x.id !== b.id) });
        get().addItem(r.output, yieldL);
        set((st: any) => ({ reputation: st.reputation + (eff <= 5 ? 1 + bn.handsReward : 0) }));
        s.say('ПЕРЕГОНКА ГОТОВА: ' + yieldL + ' Л. ОТСЕЧЕНИЕ ' + eff + '%' + (perfect ? ' — ИДЕАЛЬНО!' : ''));
      },

      bottle(batchId: string) {
        const s = get();
        const b = s.batches.find((x: Batch) => x.id === batchId);
        if (!b || !b.ready) return;
        const r = RECIPES.find((x) => x.id === b.recipeId)!;
        const bn = bonuses(s.skills);
        const fq = s.bestQuality(['fermenter-basic', 'fermenter-seal', 'fermenter-pro']) || 1;
        const liters = Math.max(0.5, Math.round(r.liters * (1 + bn.yield) * (1 + 0.08 * (fq - 1)) * 10) / 10);
        set({ batches: s.batches.filter((x: Batch) => x.id !== b.id) });
        get().addItem(r.output, liters);
        set((st: any) => ({ reputation: st.reputation + 0.5 }));
        s.say('РАЗЛИТО: ' + r.name.toUpperCase() + ' — ' + liters + ' Л.');
      },

      columnComplete(): boolean {
        const s = get();
        const fams: string[][] = [
          ['tsarga-n', 'tsarga-copper', 'tsarga-pro'],
          ['packing-rpn', 'packing-sel', 'packing-pro'],
          ['dephl-simple', 'dephl-ice', 'dephl-pro'],
          ['node-simple', 'node-precise', 'node-pro'],
        ];
        return fams.every((f) => f.some((id) => s.equipment.includes(id)));
      },

      columnQuality(): number {
        const s = get();
        const fams: string[][] = [
          ['tsarga-n', 'tsarga-copper', 'tsarga-pro'],
          ['packing-rpn', 'packing-sel', 'packing-pro'],
          ['dephl-simple', 'dephl-ice', 'dephl-pro'],
          ['node-simple', 'node-precise', 'node-pro'],
        ];
        let q = 0;
        fams.forEach((f) => {
          q += Math.max(0, ...f.map((id) => {
            const it = SHOP.find((x) => x.id === id);
            return it && s.equipment.includes(id) ? (it.quality || 1) : 0;
          }));
        });
        return Math.min(3.5, Math.max(1, q / 4));
      },

      rectifyAll() {
        const s = get();
        if (!s.columnComplete()) { s.say('КОЛОННА НЕ СОБРАНА — КУПИ ВСЕ 4 УЗЛА!'); return; }
        const bn = bonuses(s.skills);
        let total = 0;
        const w = { ...s.warehouse };
        RAW_IDS.forEach((id) => { total += w[id] || 0; w[id] = 0; });
        if (total < 1) { s.say('НЕЧЕГО РЕКТИФИЦИРОВАТЬ.'); return; }
        const out = Math.round(total * Math.min(0.9, 0.75 + 0.05 * bn.purity) * 10) / 10;
        w['rectified'] = (w['rectified'] || 0) + out;
        set({ warehouse: w });
        s.say('РЕКТИФИКАЦИЯ: ' + out + ' Л РЕКТИФИКАТА 96,6%.');
      },

      barrelAll() {
        const s = get();
        if (!s.equipment.includes('barrel-oak') && !s.equipment.includes('barrel-france')) {
          s.say('НУЖНА ДУБОВАЯ БОЧКА!'); return;
        }
        let total = 0;
        const w = { ...s.warehouse };
        RAW_IDS.forEach((id) => { total += w[id] || 0; w[id] = 0; });
        if (total < 1) { s.say('БОЧКА ПУСТА — НЕТ ДИСТИЛЛЯТА.'); return; }
        const bn = bonuses(s.skills);
        const aged = Math.round(total * (1 + 0.05 * bn.aging) * 10) / 10;
        w['aged'] = (w['aged'] || 0) + aged;
        set({ warehouse: w });
        s.say('ДИСТИЛЛЯТ УШЁЛ В БОЧКУ: ' + aged + ' Л. ТЕРПЕНИЕ — ЭТО ТОЖЕ ИНГРЕДИЕНТ.');
      },

      bestQuality(ids: string[]): number {
        const s = get();
        let q = 0;
        ids.forEach((id) => {
          const it = SHOP.find((x) => x.id === id);
          if (it && s.equipment.includes(id)) q = Math.max(q, it.quality || 1);
        });
        return q;
      },

      priceOf(productId: string): number {
        const s = get();
        const prod = PRODUCTS_BY_ID[productId];
        if (!prod) return 0;
        const bn = bonuses(s.skills);
        let qm = 1;
        if (productId === 'rectified') qm = 1 + 0.1 * (s.columnQuality() - 1) + bn.purity * 0.5;
        if (productId === 'aged') {
          const bq = s.bestQuality(['barrel-oak', 'barrel-france']) || 1;
          qm = 1 + 0.15 * (bq - 1) + bn.agedPrice;
        }
        if (['ale', 'lager', 'mead', 'cider'].includes(productId)) {
          const fq = s.bestQuality(['fermenter-basic', 'fermenter-seal', 'fermenter-pro']) || 1;
          qm = 1 + 0.08 * (fq - 1);
        }
        if (productId === 'tincture') qm = 1 + bn.tinctBoost;
        if (productId === 'mead') qm *= 1 + bn.meadPrice;
        if ((productId === 'raw-fruit' || productId === 'raw-veg') && bn.rare) qm *= 1 + bn.rarePrice;
        if (productId.startsWith('raw-')) qm *= 1 + bn.aroma * 0.4;
        if (s.day % 7 === 0 && bn.rareSale && ['tincture', 'mead', 'aged'].includes(productId)) qm *= 1.5;
        const pm = 1 + Math.min(0.3, s.reputation * 0.02);
        return Math.round(prod.basePrice * (1 + bn.price) * s.marketMult * qm * pm);
      },

      sell(productId: string, liters: number) {
        const s = get();
        const have = s.warehouse[productId] || 0;
        const qty = Math.min(liters, have);
        if (qty <= 0) return;
        const money = Math.round(s.priceOf(productId) * qty);
        const w = { ...s.warehouse };
        w[productId] = have - qty;
        if (w[productId] <= 0) delete w[productId];
        set({
          warehouse: w,
          money: s.money + money,
          skillPoints: s.skillPoints + 1,
          reputation: s.reputation + (productId === 'rectified' || productId === 'aged' ? 1 : 0.5),
        });
        s.say('ПРОДАНО: ' + qty + ' Л ЗА ' + money.toLocaleString('ru') + ' РУБ. +1 ОЧКО УМЕНИЙ!');
      },

      nextDay() {
        const s = get();
        const bn = bonuses(s.skills);
        const batches = s.batches.map((b: Batch) => {
          if (b.daysLeft > 0) {
            const dl = b.daysLeft - 1;
            if (dl === 0) return { ...b, daysLeft: 0, ready: true };
            return { ...b, daysLeft: dl };
          }
          return b;
        });
        const becameReady = batches.filter(
          (b: Batch) => b.ready && !s.batches.find((x: Batch) => x.id === b.id && x.ready)
        );
        const patch: any = { day: s.day + 1, batches };
        if (bn.contract && (s.day + 1) % 7 === 0) {
          const readyL = PRODUCTS.reduce((a, p) => a + (s.warehouse[p.id] || 0), 0);
          const bonus = 500 + Math.round(s.reputation * 50) + Math.round(readyL * 20);
          patch.money = s.money + bonus;
          get().say('КОНТРАКТ С ТРАКТИРОМ: ЕЖЕНЕДЕЛЬНАЯ ПРЕМИЯ ' + bonus + ' РУБ.!');
        }
        set(patch);
        if (bn.veg) get().addItem('veg', bn.veg);
        if (bn.honey) get().addItem('honey', bn.honey);
        if (bn.fruit) get().addItem('fruit', bn.fruit);
        if (bn.herb) get().addItem('herbs', bn.herb);
        becameReady.forEach((b: Batch) => {
          const r = RECIPES.find((x) => x.id === b.recipeId);
          get().say('ГОТОВО: ' + (r ? r.name.toUpperCase() : 'ПАРТИЯ') + '!');
        });
        const swing = (Math.random() - 0.45) * 0.3 * (1 - bn.marketStab * 0.7);
        set({ marketMult: Math.max(0.8, Math.min(1.25, get().marketMult + swing)) });
        const cd = get().eventCooldown - (bn.luck ? 0.5 : 1);
        if (cd <= 0 && !get().pendingEvent) {
          const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
          set({ pendingEvent: ev.id, eventCooldown: 4 + Math.floor(Math.random() * 3) + (bn.luck ? 2 : 0) });
        } else {
          set({ eventCooldown: Math.max(0, cd) });
        }
      },

      resolveEvent(i: number) {
        const s = get();
        if (!s.pendingEvent) return;
        const ev = EVENTS.find((e) => e.id === s.pendingEvent);
        if (!ev) { set({ pendingEvent: null }); return; }
        const opt: EventOption = ev.options[i] || ev.options[0];
        const bn = bonuses(s.skills);
        const patch: any = { pendingEvent: null, eventCooldown: 4 + Math.floor(Math.random() * 3) };
        if (opt.money) {
          let m = opt.money;
          if (m < 0 && (bn.discount || bn.contract)) m = Math.ceil(m / 2);
          patch.money = s.money + m;
        }
        if (opt.rep) patch.reputation = Math.max(0, s.reputation + opt.rep);
        if (opt.market) patch.marketMult = Math.max(0.7, Math.min(1.3, s.marketMult + opt.market));
        set(patch);
        if (opt.items) Object.keys(opt.items).forEach((k) => get().addItem(k, opt.items[k]));
        s.say(opt.log);
      },

      autoProgress() {
        const s = get();
        const days = Math.min(7, Math.floor((Date.now() - s.lastVisit) / 86400000));
        if (days <= 0) return;
        set({ lastVisit: Date.now() });
        for (let i = 0; i < days; i++) get().nextDay();
        s.say('ПОКА ТЕБЯ НЕ БЫЛО, ПРОШЛО ДНЕЙ: ' + days + '. ДЯДЮШКА ТЫК НЕ СПАЛ.');
      },
    }),
    { name: 'samosgon-v6' }
  )
);
