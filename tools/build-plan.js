// ============================================================
// Строит план генерации: для каждого из 780 товаров — английский
// image-prompt, имя файла (slug.jpg) и номер партии.
//
//   node tools/build-plan.js            → tools/plan.json
//   node tools/build-plan.js --show 5   → показать первые 5 промптов
// ============================================================
const fs = require('fs');
const path = require('path');
const L = require('./lexicon');

const dataset = require('../lib/dataset.json');
// Сетки делаем строго КВАДРАТНЫМИ (NxN) — модель на квадратном холсте
// надёжно соблюдает только квадратную решётку. 4x4=16 и 2x2=4.
// Каждая подкатегория = ровно 20 товаров = одна сетка 5x4
// на холсте 4:3 — ячейки получаются почти квадратными (0.80 x 0.75).
const SHAPES = [[5, 4], [2, 2]];
const ASPECT = '4:3';
const OUT = path.join(__dirname, 'plan.json');

// Reference-изображения по подкатегориям (из ZIP и присланных фото)
const REFERENCES = require('./references.json');

// Короткое описание товара для ячейки сетки
function cellPrompt(p) {
  const obj = L.objectEn(p);
  const color = L.colorEn((p.colorOptions || [])[0]);
  const mat = L.materialEn((p.materials || [])[0]);
  return `${obj}, ${color} colour, ${mat}`;
}

// Полный одиночный промпт (используется при переснятии брака)
function soloPrompt(p) {
  const obj = L.objectEn(p);
  const color = L.colorEn((p.colorOptions || [])[0]);
  const mat = L.materialEn((p.materials || [])[0]);
  const age = L.ageEn(p.ageGroup);
  const ref = REFERENCES[p.subcategorySlug];
  return [
    `professional e-commerce product photography of ${obj},`,
    `${color} colour, made of ${mat},`,
    `for ${age},`,
    ref ? 'matching the provided reference image as closely as possible in shape, construction, proportions and distinctive details,' : '',
    'centered on a pure white seamless background,',
    'soft diffused studio lighting, subtle soft shadow under the object,',
    'whole object fully visible in frame, approximately 10% margin from image edges,',
    'square 1:1, realistic commercial product photo, sharp focus, high detail,',
    'accurate materials, natural proportions.',
    'No text, no logo, no watermark, no price tag, no people, no hands, no children,',
    'no mannequin, no collage, no frame, no decorative background.'
  ].filter(Boolean).join(' ');
}

// Промпт для сетки-контактника: N однотипных товаров одной подкатегории,
// отличаются только цветом/материалом. Строго квадратная решётка.
function gridPrompt(batch, variant) {
  const it = batch.items;
  const n = it.length;
  const cols = batch.cols || Math.round(Math.sqrt(n));
  const rows = batch.rows || Math.round(n / cols);
  const lines = it.map((x, i) => `${i + 1}. ${x.object}, ${variant ? x.colorVariant : x.color} colour, ${x.material}`);
  const ref = batch.reference;
  return [
    `A product photography contact sheet: exactly ${n} separate product photos`,
    `arranged in a strict regular grid of ${cols} columns and ${rows} rows`,
    `(${cols} x ${rows} = ${n} cells), on one single pure white seamless background.`,
    `Every cell contains exactly ONE product, fully visible, centred in its cell,`,
    `photographed from the same camera angle and at the same scale as all the others,`,
    `with clear generous white space between the cells and no borders, no captions, no numbers.`,
    ref ? `Use the provided reference photo for the exact shape, construction, proportions and distinctive details of the product type; only colour and material change between cells.` : '',
    variant ? `Show the product from a slightly different three-quarter angle than a standard front view.` : '',
    `The ${n} products, in reading order (left to right, top to bottom):`,
    lines.join('; ') + '.',
    `Professional e-commerce studio product photography, soft diffused lighting,`,
    `subtle soft shadow under each product, sharp focus, high detail, realistic materials and proportions.`,
    `Absolutely no text, no numbers, no labels, no logos, no watermark, no price tags,`,
    `no people, no hands, no children, no mannequins, no interior, no furniture, no props, no floor, no walls.`
  ].filter(Boolean).join(' ');
}

// Второй ракурс / другой цвет для images[1]
function variantColor(p) {
  const opts = p.colorOptions || [];
  return L.colorEn(opts.length > 1 ? opts[1] : opts[0]);
}

function build() {
  const products = dataset.products.slice().sort((a, b) => a.id - b.id);

  // Партии формируем внутри одной подкатегории — так в сетке однородные
  // объекты и модель не путает товары между собой.
  const bySub = new Map();
  for (const p of products) {
    if (!bySub.has(p.subcategorySlug)) bySub.set(p.subcategorySlug, []);
    bySub.get(p.subcategorySlug).push(p);
  }

  // Разбиваем список подкатегории на квадратные сетки: 16, 4, 4, ...
  function chunkSizes(total) {
    const out = [];
    let left = total;
    let si = 0;
    while (left > 0) {
      let [c, r] = SHAPES[Math.min(si, SHAPES.length - 1)];
      let n = c * r;
      while (n > left && si < SHAPES.length - 1) { si++; [c, r] = SHAPES[si]; n = c * r; }
      if (n > left) { n = left; c = r = 0; }      // остаток < 4 → одиночные
      out.push({ n, cols: c, rows: r });
      left -= n;
      if (si === 0) si = 1;
    }
    return out;
  }

  const batches = [];
  for (const [sub, list] of bySub) {
    let off = 0;
    for (const shape of chunkSizes(list.length)) {
      const chunk = list.slice(off, off + shape.n);
      off += shape.n;
      batches.push({
        index: batches.length + 1,
        subcategorySlug: sub,
        subcategoryName: chunk[0].subcategoryName,
        categoryName: chunk[0].categoryName,
        reference: REFERENCES[sub] || null,
        cols: shape.cols,
        rows: shape.rows,
        cells: shape.n,
        aspect: shape.cols === shape.rows ? '1:1' : ASPECT,
        items: chunk.map((p, n) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          cell: n + 1,
          object: L.objectEn(p),
          color: L.colorEn((p.colorOptions || [])[0]),
          colorVariant: variantColor(p),
          material: L.materialEn((p.materials || [])[0]),
          age: L.ageEn(p.ageGroup),
          cellPrompt: cellPrompt(p),
          soloPrompt: soloPrompt(p),
          file: p.slug + '.jpg'
        }))
      });
    }
  }

  for (const b of batches) b.gridPrompt = gridPrompt(b);

  const plan = {
    generatedAt: new Date().toISOString(),
    totalProducts: products.length,
    shapes: SHAPES,
    totalBatches: batches.length,
    batches
  };
  fs.writeFileSync(OUT, JSON.stringify(plan, null, 1));
  return plan;
}

if (require.main === module) {
  const plan = build();
  const show = process.argv.includes('--show')
    ? Number(process.argv[process.argv.indexOf('--show') + 1] || 3) : 0;
  console.log(`Товаров: ${plan.totalProducts}, сеток: ${plan.totalBatches}`);
  console.log(`План: tools/plan.json`);
  for (let i = 0; i < show; i++) {
    const b = plan.batches[i];
    console.log(`\n— сетка ${b.index} · ${b.categoryName} / ${b.subcategoryName} · ${b.cols}x${b.rows}=${b.cells} · ref=${b.reference ? 'да' : 'нет'}`);
    b.items.slice(0, 2).forEach(it => console.log(`   ${it.cell}. ${it.file}  |  ${it.cellPrompt}`));
  }
}

module.exports = { build, cellPrompt, soloPrompt, gridPrompt };
