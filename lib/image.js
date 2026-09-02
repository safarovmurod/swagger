// ============================================================
// Подготовка загруженной картинки.
//
// Студент присылает фотографию прямо с телефона — это легко 5-10 МБ.
// Хранить такое незачем: аватар всё равно показывают маленьким кружком.
// Поэтому картинка здесь обрезается по центру в квадрат и сжимается
// до 512×512 JPEG. На выходе получается 30-120 КБ вместо мегабайтов,
// и в базе не копится мусор.
//
// Квадрат нужен именно для кружка: круглая маска на прямоугольном фото
// срезает половину лица, а на квадрате — нет.
// ============================================================
const config = require('./config');

// jimp подгружается при первой загрузке файла, а не при старте функции:
// холодный старт от этого не тяжелеет
let JimpModule = null;
function getJimp() {
  if (!JimpModule) JimpModule = require('jimp').Jimp;
  return JimpModule;
}

const SIZE = 512;
const QUALITY = 80;

// Тип по первым байтам файла — имени и заголовку Content-Type верить нельзя
const KINDS = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP' },
  { mime: 'image/gif', ext: 'gif', test: (b) => b.slice(0, 3).toString('latin1') === 'GIF' },
  { mime: 'image/bmp', ext: 'bmp', test: (b) => b[0] === 0x42 && b[1] === 0x4d }
];

function sniff(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  return KINDS.find(k => k.test(buffer)) || null;
}

// Возвращает { ok: true, avatar: { contentType, ext, data, width, height } }
// либо { ok: false, status, message }. Исключения наружу не выходят:
// битый файл — это 415, а не пятисотка.
async function prepareAvatar(file) {
  if (!file || !file.data || !file.data.length) {
    return { ok: false, status: 400, message: 'Файл аватара пустой' };
  }
  if (file.data.length > config.maxAvatarBytes) {
    return {
      ok: false, status: 413,
      message: `Файл больше ${Math.round(config.maxAvatarBytes / 1024 / 1024)} МБ`
    };
  }
  const kind = sniff(file.data);
  if (!kind) {
    return { ok: false, status: 415, message: 'Это не картинка: подойдут jpg, png, webp, gif и bmp' };
  }

  try {
    const Jimp = getJimp();
    const image = await Jimp.read(file.data);
    // cover — обрезает по центру и заполняет квадрат целиком, без полей
    image.cover({ w: SIZE, h: SIZE });
    const data = await image.getBuffer('image/jpeg', { quality: QUALITY });
    return {
      ok: true,
      avatar: { contentType: 'image/jpeg', ext: 'jpg', data, width: SIZE, height: SIZE },
      originalBytes: file.data.length
    };
  } catch (err) {
    console.error('[avatar] не удалось обработать картинку:', err && err.message);
    return { ok: false, status: 415, message: 'Картинку не удалось прочитать — попробуйте другой файл' };
  }
}

module.exports = { prepareAvatar, sniff, SIZE };
