import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHOP, RECIPES, PRODUCTS } from '../domain/catalog';
import { SKILLS, bonuses, canLearn, Bonuses } from '../domain/skillTree';
import { EVENTS, EventOption } from '../domain/events';

export interface Batch {
  id: string;
  recipeId: string;
  daysLeft: number;
  ready: boolean;
}

interface LogEntry { day: number; text: string; }

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
          if (it && it.capBonus) cap += it.capBonus;
          if (it && it.capMult) mult *= it.capMult;
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
        if (s.money < it.price) { s.say('ДЕНЕГ НЕ ХВАТАЕТ: НУЖНО ' + it.price + ' РУБ.'); return; }
        if (it.consumable) {
          const pack = it.pack || 1;
          if (s.usedUnits() + pack > s.capacityUnits()) {
            s.say('СКЛАД ПОЛОН — РАСШИРЬ ЕГО В РАЗДЕЛЕ «СТРОЙКА СКЛАДА».');
            return;
          }
          set({ money: s.money - it.price });
          get().addItem(id, pack);
          s.say('КУПЛЕНО: ' + it.name.toUpperCase() + ' (Х' + pack + ').');
          return;
        }
        if (it.capBonus || it.capMult) {
          set({ money: s.money - it.price, constructions: [...s.constructions, id] });
        } else {
          set({ money: s.money - it.price, equipment: [...s.equipment, id] });
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
        const w = { ...s.warehouse };
        let ok = true;
        Object.keys(r.inputs).forEach((k) => { if ((w[k] || 0) < r.inputs[k]) ok = false; });
        if (!ok) { s.say('НЕ ХВАТАЕТ СЫРЬЯ НА СКЛАДЕ!'); return; }
        Object.keys(r.inputs).forEach((k) => {
          w[k] = (w[k] || 0) - r.inputs[k];
          if (w[k] <= 0) delete w[k];
        });
        set({
          warehouse: w,
          batches: [...s.batches, { id: 'b' + bidCounter++ + '_' + s.day, recipeId, daysLeft: r.days, ready: false }],
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
        const eff = Math.max(0, pct - bn.headsSoft);
        const appQ = s.bestQuality(['dimka2', 'pure-spirit-app', 'tyk-pro']) || 1;
        const yieldL = Math.max(0.5, Math.round(r.liters * (0.65 - eff * 0.01) * (1 + bn.yield) * (1 + 0.06 * (appQ - 1)) * 10) / 10);
        set({ pendingHeads: null, batches: s.batches.filter((x: Batch) => x.id !== b.id) });
        get().addItem(r.out, yieldL);
        if (eff <= 5) set((st: any) => ({ reputation: st.reputation + 1 }));
        s.say('ПЕРЕГОНКА ГОТОВА: ' + yieldL + ' Л. ОТСЕЧЕНИЕ ' + eff + '%.');
      },

      bottle(batchId: string) {
        const s = get();
        const b = s.batches.find((x: Batch) => x.id === batchId);
        if (!b || !b.ready) return;
        const r = RECIPES.find((x) => x.id === b.recipeId)!;
        const bn = bonuses(s.skills);
        const fq = s.bestQuality(['fermenter-plastic', 'fermenter-steel']) || 1;
        const liters = Math.max(0.5, Math.round(r.liters * (1 + bn.yield) * (1 + 0.08 * (fq - 1)) * 10) / 10);
        set({ batches: s.batches.filter((x: Batch) => x.id !== b.id) });
        get().addItem(r.out, liters);
        set((st: any) => ({ reputation: st.reputation + 0.5 }));
        s.say('РАЗЛИТО: ' + r.name.toUpperCase() + ' — ' + liters + ' Л.');
      },

      columnComplete(): boolean {
        const s = get();
        const fams: string[][] = [
          ['tsarga-steel', 'tsarga-copper'],
          ['dephlegm-basic', 'dephlegm-ice'],
          ['takeoff-basic'],
          ['cooler-basic', 'cooler-dimrot'],
        ];
        return fams.every((f) => f.some((id) => s.equipment.includes(id)));
      },

      columnQuality(): number {
        const s = get();
        const fams: string[][] = [
          ['tsarga-steel', 'tsarga-copper'],
          ['dephlegm-basic', 'dephlegm-ice'],
          ['takeoff-basic'],
          ['cooler-basic', 'cooler-dimrot'],
        ];
        let q = 0;
        fams.forEach((f) => {
          q += Math.max(0, ...f.map((id) => {
            const it = SHOP.find((x) => x.id === id);
            return it && s.equipment.includes(id) ? it.quality : 0;
          }));
        });
        q /= 4;
        if (s.equipment.includes('packing-selivanenko')) q += 0.5;
        return Math.min(3.5, Math.max(1, q));
      },

      rectifyAll() {
        const s = get();
        if (!s.columnComplete()) { s.say('КОЛОННА НЕ СОБРАНА — КУПИ ВСЕ 4 УЗЛА!'); return; }
        const raws = ['raw-sugar', 'raw-fruit', 'raw-veg'];
        let total = 0;
        const w = { ...s.warehouse };
        raws.forEach((id) => { total += w[id] || 0; w[id] = 0; });
        if (total < 1) { s.say('НЕЧЕГО РЕКТИФИЦИРОВАТЬ.'); return; }
        const out = Math.round(total * 0.8 * 10) / 10;
        w['rect-spirit'] = (w['rect-spirit'] || 0) + out;
        set({ warehouse: w });
        s.say('РЕКТИФИКАЦИЯ: ' + out + ' Л ЧИСТОГО СПИРТА 96,6%.');
      },

      barrelAll() {
        const s = get();
        if (!s.equipment.includes('barrel-oak') && !s.equipment.includes('barrel-france')) {
          s.say('НУЖНА ДУБОВАЯ БОЧКА!'); return;
        }
        const raws = ['raw-sugar', 'raw-fruit', 'raw-veg'];
        let total = 0;
        const w = { ...s.warehouse };
        raws.forEach((id) => { total += w[id] || 0; w[id] = 0; });
        if (total < 1) { s.say('БОЧКА ПУСТА — НЕТ ДИСТИЛЛЯТА.'); return; }
        w['aged-spirit'] = (w['aged-spirit'] || 0) + Math.round(total * 10) / 10;
        set({ warehouse: w });
        s.say('ДИСТИЛЛЯТ УШЁЛ В БОЧКУ. ТЕРПЕНИЕ — ЭТО ТОЖЕ ИНГРЕДИЕНТ.');
      },

      bestQuality(ids: string[]): number {
        const s = get();
        let q = 0;
        ids.forEach((id) => {
          const it = SHOP.find((x) => x.id === id);
          if (it && s.equipment.includes(id)) q = Math.max(q, it.quality);
        });
        return q;
      },

      priceOf(productId: string): number {
        const s = get();
        const bn = bonuses(s.skills);
        let qm = 1;
        if (productId === 'rect-spirit') qm = 1 + 0.1 * (s.columnQuality() - 1);
        if (productId === 'aged-spirit') { const bq = s.bestQuality(['barrel-oak', 'barrel-france']) || 1; qm = 1 + 0.15 * (bq - 1); }
        if (['ale', 'lager', 'mead', 'cider'].includes(productId)) {
          const fq = s.bestQuality(['fermenter-plastic', 'fermenter-steel']) || 1;
          qm = 1 + 0.08 * (fq - 1);
        }
        const pm = 1 + Math.min(0.3, s.reputation * 0.02);
        return Math.round(PRODUCTS[productId].price * (1 + bn.price) * s.marketMult * qm * pm);
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
          reputation: s.reputation + (productId === 'rect-spirit' || productId === 'aged-spirit' ? 1 : 0.5),
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
        set({ day: s.day + 1, batches });
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
        const cd = get().eventCooldown - 1;
        if (cd <= 0 && !get().pendingEvent) {
          const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
          set({ pendingEvent: ev.id, eventCooldown: 4 + Math.floor(Math.random() * 3) });
        } else {
          set({ eventCooldown: cd });
        }
      },

      resolveEvent(i: number) {
        const s = get();
        if (!s.pendingEvent) return;
        const ev = EVENTS.find((e) => e.id === s.pendingEvent);
        if (!ev) { set({ pendingEvent: null }); return; }
        const opt: EventOption = ev.options[i] || ev.options[0];
        const patch: any = { pendingEvent: null, eventCooldown: 4 + Math.floor(Math.random() * 3) };
        if (opt.money) patch.money = s.money + opt.money;
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
