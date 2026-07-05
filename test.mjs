import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const logic = html.match(/\/\* LOGIC-START \*\/([\s\S]*?)\/\* LOGIC-END \*\//)?.[1];
assert.ok(logic, 'logic blok nalezen');
const ctx = {}; vm.createContext(ctx); vm.runInContext(logic, ctx);
const T = (name, fn) => { try { fn(); console.log('ok –', name); } catch (e) { console.error('FAIL –', name); throw e; } };

T('defaultViewMonth = příští měsíc, přelom roku', () => {
  assert.equal(ctx.defaultViewMonth('2026-07-05'), '2026-08');
  assert.equal(ctx.defaultViewMonth('2026-12-15'), '2027-01');
});
T('createState: prázdný, viewMonth default', () => {
  const s = ctx.createState('2026-07-05');
  assert.equal(s.pillars.length, 0); assert.equal(s.cards.length, 0);
  assert.equal(s.viewMonth, '2026-08');
});
T('addPillar: defaulty, barvy dle pořadí, max 6', () => {
  const s = ctx.createState('2026-07-05');
  for (let i = 0; i < 6; i++) {
    const p = ctx.addPillar(s);
    assert.equal(p.color, ctx.PILLAR_COLORS[i]);
    assert.equal(p.funnel, 'dosah'); assert.equal(p.count, 4); assert.equal(p.name, '');
  }
  assert.equal(ctx.addPillar(s), null);
});
T('syncCards: generuje podle count, snížení bere nejdřív neumístěné', () => {
  const s = ctx.createState('2026-07-05');
  const p = ctx.addPillar(s); ctx.renamePillar(s, p.id, 'Testovací'); ctx.syncCards(s);
  assert.equal(s.cards.length, 4);
  s.cards[0].date = '2026-08-03'; s.cards[1].date = '2026-08-10';
  ctx.decCount(s, p.id); ctx.syncCards(s);
  assert.equal(s.cards.length, 3);
  assert.equal(s.cards.filter(c => c.date).length, 2, 'umístěné přežily');
});
T('decCount blokuje pod počet umístěných i pod 1', () => {
  const s = ctx.createState('2026-07-05');
  const p = ctx.addPillar(s); ctx.syncCards(s);
  s.cards[0].date = '2026-08-03'; s.cards[1].date = '2026-08-04'; s.cards[2].date = '2026-08-05';
  assert.equal(ctx.decCount(s, p.id), true);  ctx.syncCards(s); // 4→3 ok
  assert.equal(ctx.canDec(s, p.id), false);
  assert.equal(ctx.decCount(s, p.id), false); // 3 umístěné, dolů to nejde
  const q = ctx.addPillar(s); ctx.syncCards(s);
  for (let i = 0; i < 3; i++) { assert.equal(ctx.decCount(s, q.id), true); ctx.syncCards(s); }
  assert.equal(ctx.decCount(s, q.id), false, 'min 1');
});
T('removePillar odstraní karty a vrací počet umístěných', () => {
  const s = ctx.createState('2026-07-05');
  const p = ctx.addPillar(s); ctx.syncCards(s);
  s.cards[0].date = '2026-08-03';
  const r = ctx.removePillar(s, p.id);
  assert.equal(r.removedPlaced, 1);
  assert.equal(s.cards.length, 0); assert.equal(s.pillars.length, 0);
});
T('barvy se recyklují podle indexu po smazání', () => {
  const s = ctx.createState('2026-07-05');
  const a = ctx.addPillar(s); ctx.addPillar(s);
  ctx.removePillar(s, a.id);
  const c = ctx.addPillar(s);
  assert.equal(c.color, ctx.PILLAR_COLORS[0], 'uvolněná barva se použije znovu');
});
console.log('TASK1 OK');
