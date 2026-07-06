import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const logic = html.match(/\/\* LOGIC-START \*\/([\s\S]*?)\/\* LOGIC-END \*\//)?.[1];
assert.ok(logic, 'logic blok nalezen');
const ctx = {}; vm.createContext(ctx); vm.runInContext(logic, ctx);
const plain = (o) => JSON.parse(JSON.stringify(o));
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
  const p = ctx.addPillar(s); ctx.renamePillar(s, p.id, 'Plný'); ctx.syncCards(s);
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
  const p = ctx.addPillar(s); ctx.renamePillar(s, p.id, 'Mazací'); ctx.syncCards(s);
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

T('monthMeta: Srpen 2026 = 31 dní, 1.8. sobota → offset 5', () => {
  const m = ctx.monthMeta('2026-08');
  assert.equal(m.label, 'Srpen 2026'); assert.equal(m.days, 31); assert.equal(m.offset, 5);
});
T('monthMeta: Září 2026 = 30 dní, 1.9. úterý → offset 1', () => {
  const m = ctx.monthMeta('2026-09');
  assert.equal(m.days, 30); assert.equal(m.offset, 1);
});
T('monthGrid: offset nullů + ISO klíče', () => {
  const g = ctx.monthGrid('2026-08');
  assert.equal(g.length, 5 + 31);
  assert.equal(g[0], null); assert.equal(g[4], null);
  assert.deepEqual(plain(g[5]), { iso: '2026-08-01', day: 1 });
  assert.deepEqual(plain(g[35]), { iso: '2026-08-31', day: 31 });
});
T('addMonths přes přelom roku oběma směry', () => {
  assert.equal(ctx.addMonths('2026-12', 1), '2027-01');
  assert.equal(ctx.addMonths('2026-01', -1), '2025-12');
});
T('funnelBreakdown: largest remainder, součet 100', () => {
  const s = ctx.createState('2026-07-05');
  const a = ctx.addPillar(s), b = ctx.addPillar(s), c = ctx.addPillar(s);
  ctx.renamePillar(s, a.id, 'A'); ctx.renamePillar(s, b.id, 'B'); ctx.renamePillar(s, c.id, 'C');
  [a, b, c].forEach(p => { while (p.count > 1) { ctx.decCount(s, p.id); } });
  ctx.setFunnel(s, b.id, 'duvera'); ctx.setFunnel(s, c.id, 'prodej'); ctx.syncCards(s);
  const fb = ctx.funnelBreakdown(s);
  assert.equal(fb.total, 3);
  const pcts = fb.rows.map(r => r.pct);
  assert.equal(pcts.reduce((x, y) => x + y, 0), 100);
  assert.deepEqual([...pcts].sort((x, y) => y - x), [34, 33, 33]);
});
T('repurpose: toggle tam a zpět, jen platné klíče', () => {
  const s = ctx.createState('2026-07-05');
  const p = ctx.addPillar(s); ctx.renamePillar(s, p.id, 'Témata'); ctx.syncCards(s);
  const c = ctx.trayCards(s)[0];
  assert.deepEqual(plain(c.repurpose), []);
  ctx.toggleRepurpose(s, c.id, 'carousel'); ctx.toggleRepurpose(s, c.id, 'newsletter');
  assert.deepEqual(plain(c.repurpose), ['carousel', 'newsletter']);
  ctx.toggleRepurpose(s, c.id, 'carousel');
  assert.deepEqual(plain(c.repurpose), ['newsletter']);
  ctx.toggleRepurpose(s, c.id, 'blbost');
  assert.deepEqual(plain(c.repurpose), ['newsletter']);
});
T('setPillarColor: jen barvy z palety', () => {
  const s = ctx.createState('2026-07-05');
  const p = ctx.addPillar(s);
  ctx.setPillarColor(s, p.id, ctx.PILLAR_COLORS[3]);
  assert.equal(p.color, ctx.PILLAR_COLORS[3]);
  ctx.setPillarColor(s, p.id, '#ff0000');
  assert.equal(p.color, ctx.PILLAR_COLORS[3], 'mimo paletu se ignoruje');
});
T('paleta: 12 unikátních barev vč. červené/oranžové/žluté', () => {
  assert.equal(ctx.PILLAR_COLORS.length, 12);
  assert.equal(new Set(ctx.PILLAR_COLORS).size, 12);
  for (const c of ['#980323', '#C24E00', '#A87900']) assert.ok(ctx.PILLAR_COLORS.includes(c), c + ' v paletě');
  const s = ctx.createState('2026-07-05');
  const p = ctx.addPillar(s);
  ctx.setPillarColor(s, p.id, '#C24E00');
  assert.equal(p.color, '#C24E00');
});
T('cardsForPillar: seřazené dle id', () => {
  const s = ctx.createState('2026-07-05');
  const p = ctx.addPillar(s); ctx.renamePillar(s, p.id, 'Řazení'); ctx.syncCards(s);
  const ids = ctx.cardsForPillar(s, p.id).map(c => c.id);
  assert.deepEqual(plain(ids), [...ids].sort((a, b) => a - b));
  assert.equal(ids.length, 4);
});
T('place/unplace/progress/isDirty + unnamed negeneruje karty', () => {
  const s = ctx.createState('2026-07-05');
  assert.equal(ctx.isDirty(s), false);
  const p = ctx.addPillar(s); ctx.syncCards(s);
  assert.equal(s.cards.length, 0, 'nepojmenovaný pilíř negeneruje karty');
  assert.equal(ctx.isDirty(s), false, 'nepojmenovaný pilíř bez umístění není dirty');
  ctx.renamePillar(s, p.id, 'Série'); ctx.syncCards(s);
  assert.equal(s.cards.length, 4, 'pojmenování aktivuje karty');
  assert.equal(ctx.isDirty(s), true);
  const card = ctx.trayCards(s)[0];
  ctx.placeCard(s, card.id, '2026-08-03');
  assert.deepEqual(plain(ctx.progress(s)), { placed: 1, total: 4 });
  assert.equal(ctx.placedForDate(s, '2026-08-03').length, 1);
  ctx.unplaceCard(s, card.id);
  assert.deepEqual(plain(ctx.progress(s)), { placed: 0, total: 4 });
});
console.log('TASK2 OK');

T('kusy: české plurály', () => {
  assert.equal(ctx.kusy(1), 'kus');
  assert.equal(ctx.kusy(2), 'kusy'); assert.equal(ctx.kusy(4), 'kusy');
  assert.equal(ctx.kusy(5), 'kusů'); assert.equal(ctx.kusy(12), 'kusů');
});
console.log('TASK9 OK');
