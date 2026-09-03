// ============================================================
// Разбор multipart/form-data без внешних библиотек.
//
// Нужен ровно для одного места — регистрации с файлом аватара
// (POST /api/auth/register). Тело читается в Buffer целиком, поэтому
// размер ограничен сверху: и общий (MAX_BODY_BYTES), и файла (MAX_AVATAR_BYTES).
//
// Тип файла определяется не по имени и не по заголовку Content-Type,
// а по первым байтам: имя и заголовок присылает клиент, им верить нельзя.
// ============================================================
const config = require('./config');

// Читает сырое тело запроса. На Vercel неизвестный content-type уже лежит
// в req.body как Buffer; локально приходит поток. Строку разбираем как
// latin1 — так двоичные данные не портятся.
function readRawBody(req, maxBytes) {
  const limit = maxBytes || config.maxBodyBytes;

  if (Buffer.isBuffer(req.body)) {
    return Promise.resolve({ ok: req.body.length <= limit, buffer: req.body });
  }
  if (typeof req.body === 'string') {
    const buf = Buffer.from(req.body, 'latin1');
    return Promise.resolve({ ok: buf.length <= limit, buffer: buf });
  }
  if (req.body && typeof req.body === 'object' && !req.readable) {
    // тело уже разобрано хостингом как JSON — двоичных данных здесь нет
    return Promise.resolve({ ok: true, buffer: Buffer.alloc(0), parsed: req.body });
  }

  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve({ ok, buffer: Buffer.concat(chunks) });
    };
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        chunks.length = 0;
        req.pause();
        return finish(false);
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish(true));
    req.on('error', () => finish(true));
  });
}

function boundaryOf(contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(String(contentType || ''));
  const b = m ? (m[1] || m[2]).trim() : '';
  return b;
}

function isMultipart(req) {
  return /^multipart\/form-data/i.test(String((req.headers || {})['content-type'] || ''));
}

// Разбирает Buffer на поля и файлы.
// Возвращает { fields: {name: string}, files: {name: {filename, contentType, data}} }
function parseMultipart(buffer, contentType) {
  const boundary = boundaryOf(contentType);
  const out = { fields: {}, files: {} };
  if (!boundary || !buffer || !buffer.length) return out;

  const sep = Buffer.from(`--${boundary}`);
  const parts = [];
  let index = buffer.indexOf(sep);
  while (index >= 0) {
    const start = index + sep.length;
    const next = buffer.indexOf(sep, start);
    if (next < 0) break;
    // между разделителями: CRLF ... CRLF
    parts.push(buffer.slice(start, next));
    index = next;
  }

  parts.forEach((part) => {
    let body = part;
    if (body.slice(0, 2).toString('latin1') === '\r\n') body = body.slice(2);
    const headEnd = body.indexOf('\r\n\r\n');
    if (headEnd < 0) return;
    const head = body.slice(0, headEnd).toString('utf8');
    let data = body.slice(headEnd + 4);
    if (data.slice(-2).toString('latin1') === '\r\n') data = data.slice(0, -2);

    const disposition = /content-disposition:[^\r\n]*/i.exec(head);
    if (!disposition) return;
    const nameMatch = /name="([^"]*)"/i.exec(disposition[0]);
    if (!nameMatch) return;
    const name = nameMatch[1];
    const fileMatch = /filename="([^"]*)"/i.exec(disposition[0]);
    const typeMatch = /content-type:\s*([^\r\n;]+)/i.exec(head);

    if (fileMatch) {
      if (!fileMatch[1]) return; // пустое поле файла — файл не выбрали
      out.files[name] = {
        filename: fileMatch[1],
        contentType: (typeMatch ? typeMatch[1] : 'application/octet-stream').trim().toLowerCase(),
        data
      };
    } else {
      out.fields[name] = data.toString('utf8');
    }
  });

  return out;
}

// Тип картинки по сигнатуре файла. Ничего, кроме трёх разрешённых
// форматов, не проходит: ни .svg (он умеет выполнять скрипты),
// ни .exe/.php/.html/.js — как бы ни назывался файл.
const IMAGE_KINDS = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  {
    mime: 'image/webp', ext: 'webp',
    test: (b) => b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP'
  }
];

function sniffImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  return IMAGE_KINDS.find(k => k.test(buffer)) || null;
}

// Полная проверка загружаемого аватара: расширение, заявленный тип,
// содержимое и размер. Возвращает { ok, kind } либо { ok: false, status, message }.
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp'];

function checkAvatar(file) {
  if (!file || !file.data || !file.data.length) {
    return { ok: false, status: 400, message: 'Файл аватара пустой' };
  }
  if (file.data.length > config.maxAvatarBytes) {
    return {
      ok: false, status: 413,
      message: `Аватар больше ${Math.round(config.maxAvatarBytes / 1024)} КБ`
    };
  }
  const ext = String(file.filename || '').split('.').pop().toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return { ok: false, status: 415, message: 'Разрешены только файлы .jpg, .png и .webp' };
  }
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.contentType)) {
    return { ok: false, status: 415, message: `Тип ${file.contentType} не разрешён, нужен image/jpeg, image/png или image/webp` };
  }
  const kind = sniffImage(file.data);
  if (!kind) {
    return { ok: false, status: 415, message: 'Содержимое файла не похоже на изображение JPEG, PNG или WebP' };
  }
  return { ok: true, kind };
}

module.exports = { readRawBody, parseMultipart, isMultipart, boundaryOf, sniffImage, checkAvatar };
