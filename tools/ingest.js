#!/usr/bin/env node
// ============================================================
// Принимает скачанную сетку-контактный лист одной подкатегории,
// режет её на отдельные квадраты и раскладывает под именами
// slug.jpg в assets/products/ (или assets/products/variant2/).
//
//   node tools/ingest.js krovatki work/grids/krovatki.png
//   node tools/ingest.js krovatki work/grids/k2.png --variant 2
//   node tools/ingest.js --status
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PLAN = path.join(__dirname, 'plan.json');
const STATE = path.join(__dirname, 'state.json');
const OUT_MAIN = path.join(ROOT, 'assets', 'products');
const OUT_VAR = path.join(ROOT, 'assets', 'products', 'v2');

function loadPlan() { return JSON.parse(fs.readFileSync(PLAN, 'utf8')); }
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); }
  catch { return { done: {}, v2: {}, failed: [] }; }
}
function saveState(s) { fs.writeFileSync(STATE, JSON.stringify(s, null, 1)); }

// Все партии одной подкатегории по порядку id
function itemsOf(plan, sub) {
  return plan.batches
    .filter(b => b.subcategorySlug === sub)
    .sort((a, b) => a.index - b.index)
    .flatMap(b => b.items);
}

function slice(grid, outDir, names, expect) {
  const args = [
    path.join(__dirname, 'slice_grid.py'), grid,
    '--out', outDir,
    '--names', names.join(','),
    '--size', '800', '--margin', '0.07', '--quality', '82',
    '--expect', String(expect)
  ];
  let code = 0, out = '';
  try { out = execFileSync('python3', args, { encoding: 'utf8' }); }
  catch (e) { code = e.status || 1; out = (e.stdout || '') + (e.stderr || ''); }
  return { code, out };
}

function ingest(sub, grid, variant) {
  const plan = loadPlan();
  const state = loadState();
  const items = itemsOf(plan, sub);
  if (!items.length) { console.error(`нет подкатегории: ${sub}`); process.exit(1); }

  const names = items.map(it => it.file);
  const outDir = variant ? OUT_VAR : OUT_MAIN;
  const r = slice(grid, outDir, names, items.length);

  // Проверяем, что все файлы реально созданы
  const ok = [], miss = [];
  for (const it of items) {
    const f = path.join(outDir, it.file);
    (fs.existsSync(f) && fs.statSync(f).size > 2000 ? ok : miss).push(it);
  }

  const bucket = variant ? state.v2 : state.done;
  for (const it of ok) bucket[it.slug] = it.id;
  state.failed = (state.failed || []).filter(x => !(x.sub === sub && !!x.variant === !!variant));
  for (const it of miss) state.failed.push({ sub, id: it.id, slug: it.slug, variant: variant || 1 });
  saveState(state);

  // Отчёт партии: id | slug | готово
  console.log(`\n— ${sub}${variant ? ' (вариант 2)' : ''} · ячеек найдено: ${(r.out.match(/ячеек: (\d+)/) || [])[1] || '?'}`);
  console.log('  id  | slug                                             | готово');
  console.log('  ----+--------------------------------------------------+-------');
  for (const it of items) {
    const good = !!bucket[it.slug] || ok.includes(it);
    console.log(`  ${String(it.id).padStart(3)} | ${it.slug.slice(0, 48).padEnd(48)} | ${good ? 'да' : 'НЕТ'}`);
  }
  status(plan, state);
  if (miss.length) console.error(`\nбрак: ${miss.length} → ${miss.map(m => m.id).join(', ')}`);
  return miss.length;
}

function status(plan, state) {
  const total = plan.totalProducts;
  const d = Object.keys(state.done || {}).length;
  const v = Object.keys(state.v2 || {}).length;
  console.log(`\nГотово ${d} из ${total}, осталось ${total - d}   |   вариант 2: ${v} из ${total}`);
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === '--status') { status(loadPlan(), loadState()); process.exit(0); }
  if (a[0] === '--todo') {
    const plan = loadPlan(), st = loadState();
    const key = a[1] === '2' ? 'v2' : 'done';
    const subs = [...new Set(plan.batches.map(b => b.subcategorySlug))];
    const left = subs.filter(s => itemsOf(plan, s).some(it => !(st[key] || {})[it.slug]));
    console.log(left.join('\n'));
    process.exit(0);
  }
  const variant = a.includes('--variant') ? Number(a[a.indexOf('--variant') + 1]) : 0;
  const pos = a.filter(x => !x.startsWith('--') && x !== String(variant));
  if (pos.length < 2) { console.error('usage: ingest.js <sub> <grid.png> [--variant 2]'); process.exit(1); }
  process.exit(ingest(pos[0], pos[1], variant === 2 ? 2 : 0) ? 2 : 0);
}

module.exports = { itemsOf, loadPlan, loadState };
