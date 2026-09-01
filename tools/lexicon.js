// ============================================================
// Луғат для генерации фотографий товаров.
// Переводит русские данные каталога в английские термины
// для image-prompt: объект, цвет, материал, возраст.
// ============================================================

// --- Цвета ---------------------------------------------------
const COLOR = {
  'Мятный': 'mint green',
  'Серый': 'grey',
  'Белый': 'white',
  'Голубой': 'light blue',
  'Розовый': 'pink',
  'Бежевый': 'beige',
  'Венге': 'dark wenge brown',
  'Синий': 'blue',
  'Пудровый': 'powder pink',
  'Молочный': 'milky off-white',
  'Слоновая кость': 'ivory',
  'Натуральный': 'natural wood tone',
  'Орех': 'walnut brown',
  'Ваниль': 'vanilla cream',
  'Кремовый': 'cream',
  'Чёрный': 'black',
  'Бордовый': 'burgundy',
  'Оливковый': 'olive green',
  'Хаки': 'khaki',
  'Графит': 'graphite grey',
  'Красный': 'red',
  'Прозрачный': 'transparent clear',
  'Джинсовый': 'denim blue',
  'Сиреневый': 'lilac',
  'Жёлтый': 'yellow',
  'Без цвета': 'neutral white',
  'Разноцветный': 'multicolour',
  'Зелёный': 'green'
};

// --- Материалы -----------------------------------------------
const MATERIAL = {
  'Хлопок': 'cotton', 'Силикон': 'silicone', 'Пластик': 'plastic',
  'Текстиль': 'textile fabric', 'Массив бука': 'solid beech wood',
  'МДФ': 'MDF board', 'Сосна': 'pine wood', 'Берёза': 'birch wood',
  'Дуб': 'oak wood', 'Алюминий': 'aluminium', 'Ротанг': 'rattan',
  'ЛДСП': 'laminated chipboard', 'Массив сосны': 'solid pine wood',
  'Сатин': 'satin cotton', 'Бязь': 'calico cotton',
  'Холлофайбер': 'hollowfibre filling', 'Поролон': 'foam',
  'Полиэстер': 'polyester', 'Резина': 'rubber', 'Эко-кожа': 'eco leather',
  'Пенополистирол': 'polystyrene foam', 'Металл': 'metal',
  'Интерлок': 'interlock cotton knit', 'Бамбук': 'bamboo',
  'Велюр': 'velour', 'Футер': 'french terry cotton', 'Флис': 'fleece',
  'Мембрана': 'membrane fabric', 'Джинса': 'denim',
  'Трикотаж': 'knitted jersey', 'Тритан': 'tritan plastic',
  'Полипропилен': 'polypropylene', 'Стекло': 'glass', 'Латекс': 'latex',
  'Нержавеющая сталь': 'stainless steel', 'Картон': 'cardboard',
  'Целлюлоза': 'cellulose', 'Суперабсорбент': 'superabsorbent',
  'Нетканое полотно': 'non-woven fabric',
  'Растительные масла': 'plant oil formula', 'Пантенол': 'panthenol formula',
  'Оксид цинка': 'zinc oxide cream', 'Глицерин': 'glycerin formula',
  'Махра': 'terry cotton', 'Муслин': 'muslin cotton', 'Дерево': 'wood',
  'АБС-пластик': 'ABS plastic', 'Магнит': 'magnet', 'Плюш': 'plush'
};

// --- Возраст --------------------------------------------------
const AGE = {
  '0-3 года': 'a child aged 0-3 years',
  '0-5 лет': 'a child aged 0-5 years',
  '0-6 мес': 'a newborn 0-6 months',
  '0-7 лет': 'a child aged 0-7 years',
  '6 мес - 3 года': 'a child aged 6 months to 3 years',
  '0-13 кг (0-15 мес)': 'an infant 0-13 kg',
  '9-18 кг (9 мес - 4 года)': 'a toddler 9-18 kg',
  '15-36 кг (3-12 лет)': 'a child 15-36 kg',
  '0-18 кг (0-4 года)': 'a child 0-18 kg',
  '22-36 кг (6-12 лет)': 'a child 22-36 kg',
  '0-12 лет': 'a child aged 0-12 years',
  '1-7 лет': 'a child aged 1-7 years',
  '0-18 мес': 'a baby 0-18 months',
  '0-24 мес': 'a baby 0-24 months',
  '6 мес - 4 года': 'a child aged 6 months to 4 years',
  '0-4 года': 'a child aged 0-4 years',
  '1.5-7 лет': 'a child aged 1.5-7 years',
  '1-6 лет': 'a child aged 1-6 years',
  '2-7 лет': 'a child aged 2-7 years'
};

// --- Объект по «Типу» внутри подкатегории ---------------------
// Ключ: subcategorySlug -> { «Тип из данных»: english object }
const BY_TIP = {
  aksessuary: {
    'Мобиль': 'a hanging crib mobile with soft toys on a rotating arm',
    'Комплект белья': 'a folded baby crib bedding set: duvet cover, sheet and pillowcase',
    'Матрас': 'a baby crib mattress, rectangular, quilted cover',
    'Наматрасник': 'a folded waterproof crib mattress protector',
    'Балдахин': 'a crib canopy of sheer fabric on a holder',
    'Бортики': 'a set of padded crib bumpers, tied and arranged in a row'
  },
  'aksessuary-avtokresla': {
    'Зеркало заднего вида': 'a baby car back-seat mirror with an adjustable strap',
    'Солнцезащитная шторка': 'a car window sun shade for kids',
    'Органайзер': 'a car seat back organiser with pockets',
    'Летний чехол': 'a breathable summer cover for a child car seat',
    'Накладки на ремни': 'a pair of padded car harness strap covers',
    'Защитный коврик': 'a car seat protector mat placed flat'
  },
  'dlya-novorozhdennyh': {
    'Боди': 'a single baby bodysuit laid flat',
    'Комбинезон-слип': 'a footed baby sleepsuit laid flat',
    'Ползунки': 'a pair of baby footed trousers laid flat',
    'Комплект 3 предмета': 'a folded 3-piece newborn clothing set: bodysuit, trousers and cap',
    'Распашонка': 'a baby wrap top with fold-over mittens laid flat'
  },
  malchikam: {
    'Костюм': "a boys' two-piece outfit set: jumper and trousers, laid flat",
    'Комбинезон': "a boys' overall laid flat",
    'Брюки': "a pair of boys' trousers laid flat",
    'Футболка': "a boys' t-shirt laid flat",
    'Джемпер': "a boys' knitted jumper laid flat",
    'Куртка': "a boys' jacket laid flat"
  },
  devochkam: {
    'Джемпер': "a girls' knitted jumper laid flat",
    'Платье': "a girls' dress laid flat",
    'Костюм': "a girls' two-piece outfit set: top and trousers, laid flat",
    'Комбинезон': "a girls' overall laid flat",
    'Юбка': "a girls' skirt laid flat",
    'Куртка': "a girls' jacket laid flat"
  },
  molokootsosy: {
    'Электрический': 'an electric breast pump with motor unit and bottle',
    'Двухфазный электрический': 'a double electric breast pump with two bottles',
    'Ручной': 'a manual breast pump with handle and bottle'
  },
  stulchiki: {
    'Подвесной': 'a clip-on hook-to-table baby feeding chair',
    'Растущий': 'a wooden growing high chair with adjustable footrest',
    'Трансформер': 'a convertible baby high chair that converts to a table and chair',
    'Классический': 'a classic baby high chair with removable tray'
  },
  'detskaya-posuda': {
    'Ложки и вилки': 'a set of baby spoons and a fork',
    'Термотарелка': 'a baby thermo plate with a warm water compartment',
    'Набор 5 предметов': 'a 5-piece baby tableware set: plate, bowl, cup, spoon and fork',
    'Набор 3 предмета': 'a 3-piece baby tableware set: plate, cup and spoon',
    'Тарелка на присоске': 'a baby suction plate with divided sections',
    'Поильник': 'a baby sippy cup with handles'
  },
  'detskoe-pitanie': {
    'Пюре': 'a small glass jar of baby fruit puree with a label',
    'Каша': 'a cardboard box of instant baby cereal',
    'Печенье': 'a pack of baby biscuits',
    'Сок': 'a small carton of baby juice',
    'Сухая смесь': 'a tin of powdered infant formula milk'
  },
  podguzniki: {
    'Трусики': 'a pack of baby pull-up training pants',
    'Подгузники': 'a pack of disposable baby nappies'
  },
  kupanie: {
    'Сиденье': 'a baby bath seat with suction cups',
    'Ванночка': 'a plastic baby bath tub',
    'Горка для купания': 'a baby bath support sling on a frame',
    'Ковш для мытья головы': 'a baby head-washing rinse cup with a soft edge',
    'Термометр для воды': 'a floating baby bath water thermometer',
    'Круг на шею': 'an inflatable baby neck swim ring'
  },
  'uhod-za-kozhey': {
    'Пенка для купания': 'a bottle of baby bath foam with pump',
    'Присыпка': 'a bottle of baby powder',
    'Влажные салфетки': 'a pack of baby wet wipes',
    'Масло': 'a bottle of baby massage oil',
    'Шампунь': 'a bottle of baby shampoo',
    'Молочко для тела': 'a bottle of baby body lotion',
    'Крем под подгузник': 'a tube of baby nappy rash cream'
  },
  'aptechka-gradusniki': {
    'Ингалятор': 'a compact compressor nebuliser with a child mask',
    'Газоотводная трубка': 'a baby gas relief tube in its package',
    'Детская аптечка': 'an open baby first-aid kit case with contents',
    'Аспиратор назальный': 'a baby nasal aspirator',
    'Термометр инфракрасный': 'an infrared non-contact forehead thermometer'
  },
  'strizhka-manikur': {
    'Маникюрный набор': 'a baby manicure set in an open case: scissors, clippers and file',
    'Ножницы детские': 'a pair of baby nail scissors with rounded tips',
    'Пилка электрическая': 'an electric baby nail file with attachments',
    'Расчёска и щётка': 'a baby soft brush and comb set',
    'Машинка для стрижки': 'a quiet baby hair clipper with guards'
  },
  razvivayushchie: {
    'Бизиборд': 'a wooden busy board with latches, gears and buttons',
    'Мягкая книжка': 'a soft cloth baby book, open',
    'Сортер': 'a wooden shape sorter cube with blocks',
    'Развивающий коврик': 'a baby play mat with hanging toy arches',
    'Каталка': 'a push-along pull toy on wheels',
    'Пирамидка': 'a stacking rings pyramid toy'
  }
};

// --- Объект по подкатегории (когда «Тип» отсутствует) ---------
const BY_SUBCAT = {
  'skidki-nedeli': 'a nursery gift box filled with baby care items',
  'rasprodazha-ostatkov': 'a boxed nursery product in its retail carton',
  'nabory-k-vypiske': 'an open newborn gift box with folded baby clothes, a bib and a bottle',

  krovatki: 'a wooden baby cot with vertical slatted sides and a drawer under the base',
  kolybeli: 'a bedside bassinet crib on adjustable legs with fabric mesh sides',
  lyulki: 'a woven moses basket bassinet with a fabric hood and carry handles',
  'pelenalnye-komody': 'a nursery chest of drawers with a changing top and raised edges',
  shkafy: "a children's wardrobe with two doors and a drawer",

  progulochnye: 'a lightweight folding baby buggy stroller with a canopy and a shopping basket',
  transformery: 'a convertible 2-in-1 pram with a carrycot mounted on a chassis with large wheels',
  'dlya-dvoyni': 'a double twin baby stroller with two seats side by side',

  'gruppa-0-plus': 'an infant car seat carrier with a carry handle and a canopy',
  'gruppa-1': 'a toddler car seat with a 5-point harness',
  'gruppa-2-3': 'a high-back booster car seat with a headrest',
  'gruppa-0-1': 'a rotating convertible child car seat on an ISOFIX base',
  bustery: 'a backless booster car seat cushion',

  butylochki: 'a baby feeding bottle with a silicone teat and a cap',
  'soski-pustyshki': 'a baby pacifier with a ventilated shield',

  'polotenca-halaty': 'a folded hooded baby towel with a corner hood',

  konstruktory: "a set of children's building blocks, large colourful bricks in a pile",
  muzykalnye: 'a musical baby toy instrument',
  interaktivnye: 'an interactive electronic baby toy',
  'obuchayushchie-planshety': "a children's educational tablet toy with letter and number buttons",
  'myagkie-igrushki': 'a plush stuffed toy animal, sitting'
};

// --- Уточнение по названию (для подкатегорий без «Типа») ------
// Порядок важен: первое совпадение выигрывает.
// Области действия подслов по названию. Без них «Полотенце Зайка»
// превращалось в плюшевого зайца, а «Бутылочка-термос» — в термос.
const TOYS = /^(razvivayushchie|konstruktory|muzykalnye|interaktivnye|obuchayushchie-planshety|myagkie-igrushki)$/;
const FEED = /^(butylochki|detskaya-posuda|detskoe-pitanie|soski-pustyshki)$/;
const MEDS = /^(aptechka-gradusniki|strizhka-manikur|uhod-za-kozhey)$/;
const BEDS = /^(krovatki|kolybeli|lyulki|transformery)$/;

const BY_NAME = [
  // музыкальные
  [/караоке|микрофон/i, 'a toy microphone with a stand', TOYS],
  [/пианино|синтезатор/i, 'a colourful toy piano keyboard', TOYS],
  [/барабан/i, 'a toy drum', TOYS],
  [/ксилофон/i, 'a wooden toy xylophone with mallets', TOYS],
  [/гитар/i, 'a small toy guitar', TOYS],
  [/мобиль/i, 'a musical crib mobile with hanging plush toys', /^(muzykalnye|aksessuary)$/],
  [/ночник[- ]?мишк/i, 'a plush teddy bear night light toy', TOYS],
  [/ночник[- ]?зай/i, 'a plush bunny night light toy', TOYS],
  [/ночник/i, 'a musical baby night light projector', TOYS],
  // интерактивные
  [/руль/i, 'a toy steering wheel play centre with buttons', TOYS],
  [/динозавр/i, 'an interactive plush dinosaur toy', TOYS],
  [/планшет/i, "a children's toy tablet with buttons", TOYS],
  [/телефон/i, 'a toy mobile phone for babies', TOYS],
  [/робот/i, 'a small toy robot', TOYS],
  [/кот[её]нок|кошеч/i, 'a plush kitten soft toy, sitting', TOYS],
  [/щенок|собач/i, 'an interactive plush puppy toy', TOYS],
  // мягкие
  [/зайк|заяц|кролик/i, 'a plush bunny soft toy, sitting', TOYS],
  [/мишк|медвеж/i, 'a plush teddy bear, sitting', TOYS],
  [/лис[её]нок|лиса/i, 'a plush fox soft toy, sitting', TOYS],
  [/сов[её]нок|сова/i, 'a plush owl soft toy', TOYS],
  [/слон/i, 'a plush elephant soft toy', TOYS],
  [/жираф/i, 'a plush giraffe soft toy', TOYS],
  [/пингвин/i, 'a plush penguin soft toy', TOYS],
  // конструкторы
  [/ферма/i, "a children's building blocks farm set with animal bricks", TOYS],
  [/город/i, "a children's building blocks town set with house bricks", TOYS],
  [/замок/i, "a children's building blocks castle set", TOYS],
  // питание / посуда
  [/термос/i, 'a baby food thermos flask', FEED],
  [/ниблер/i, 'a baby fruit feeder nibbler', FEED],
  // гигиена
  [/аспиратор/i, 'a baby nasal aspirator', MEDS],
  [/градусник|термометр/i, 'a digital baby thermometer', MEDS],
  // мебель
  [/маятник/i, 'a wooden baby cot with a pendulum swing mechanism and slatted sides', BEDS]
];

const clean = (s) => String(s || '').trim();

function colorEn(ru) { return COLOR[clean(ru)] || 'neutral'; }
function materialEn(ru) { return MATERIAL[clean(ru)] || 'mixed materials'; }
function ageEn(ru) { return AGE[clean(ru)] || 'a small child'; }

// Определяет английское описание объекта для товара
function objectEn(product) {
  const sub = product.subcategorySlug;
  const tip = clean((product.characteristics || {})['Тип']);

  if (tip && BY_TIP[sub] && BY_TIP[sub][tip]) return BY_TIP[sub][tip];

  // Подсказка по названию — только где нет «Типа» и только в своей области
  if (!tip) {
    for (const [re, obj, scope] of BY_NAME) {
      if (scope && !scope.test(sub)) continue;
      if (re.test(product.name)) return obj;
    }
  }

  if (BY_SUBCAT[sub]) return BY_SUBCAT[sub];
  return 'a baby product';
}

module.exports = { COLOR, MATERIAL, AGE, BY_TIP, BY_SUBCAT, BY_NAME, colorEn, materialEn, ageEn, objectEn };
