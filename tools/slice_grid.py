#!/usr/bin/env python3
"""
Режет сетку-контактный лист на отдельные квадратные фотографии товаров.

Сетка приходит от генератора как одно большое изображение, в котором
товары стоят рядами на белом фоне. Число строк и столбцов модель
не всегда соблюдает, поэтому оно определяется автоматически: по
проекциям «небелых» пикселей находятся полосы фона между рядами
и между колонками.

Использование:
    python3 tools/slice_grid.py work/grids/test.png --out work/cells
    python3 tools/slice_grid.py work/grids/test.png --expect 12
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

# Пиксель считается фоном, если он светлее порога по всем каналам.
WHITE = 238
# Полоса считается разделителем, если доля «товарных» пикселей ниже этого.
EMPTY_RATIO = 0.004
# Минимальная ширина/высота ячейки в долях от стороны изображения.
MIN_CELL = 0.06


def ink_mask(img):
    """Булева маска: True там, где не белый фон."""
    a = np.asarray(img.convert("RGB"), dtype=np.int16)
    return (a < WHITE).any(axis=2)


def find_bands(profile, length, min_size):
    """
    По одномерному профилю плотности возвращает список (start, end)
    непрерывных участков с содержимым.
    """
    filled = profile > EMPTY_RATIO
    bands, start = [], None
    for i, v in enumerate(filled):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= min_size:
                bands.append((start, i))
            start = None
    if start is not None and length - start >= min_size:
        bands.append((start, length))
    return bands


def detect_cells(img):
    """Возвращает список bbox ячеек в порядке слева-направо, сверху-вниз."""
    mask = ink_mask(img)
    h, w = mask.shape
    rows = find_bands(mask.mean(axis=1), h, int(h * MIN_CELL))
    if not rows:
        return []

    cells = []
    for (y0, y1) in rows:
        band = mask[y0:y1, :]
        cols = find_bands(band.mean(axis=0), w, int(w * MIN_CELL))
        for (x0, x1) in cols:
            sub = band[:, x0:x1]
            ys = np.where(sub.any(axis=1))[0]
            xs = np.where(sub.any(axis=0))[0]
            if len(ys) == 0 or len(xs) == 0:
                continue
            cells.append((x0 + xs[0], y0 + ys[0], x0 + xs[-1] + 1, y0 + ys[-1] + 1))
    return cells


def export_cell(img, box, size, margin, out_path, quality):
    """
    Вырезает товар, вписывает его в квадрат заданного размера
    с полем margin и сохраняет как JPEG на белом фоне.
    """
    crop = img.crop(box)
    inner = int(round(size * (1 - 2 * margin)))
    cw, ch = crop.size
    scale = min(inner / cw, inner / ch)
    new = (max(1, int(round(cw * scale))), max(1, int(round(ch * scale))))
    crop = crop.resize(new, Image.LANCZOS)

    canvas = Image.new("RGB", (size, size), (255, 255, 255))
    canvas.paste(crop, ((size - new[0]) // 2, (size - new[1]) // 2))
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    canvas.save(out_path, "JPEG", quality=quality, optimize=True, progressive=True)
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("grid")
    ap.add_argument("--out", default="work/cells")
    ap.add_argument("--prefix", default="cell")
    ap.add_argument("--names", default="", help="через запятую: имена файлов по порядку ячеек")
    ap.add_argument("--size", type=int, default=800)
    ap.add_argument("--margin", type=float, default=0.08)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--expect", type=int, default=0)
    args = ap.parse_args()

    img = Image.open(args.grid).convert("RGB")
    cells = detect_cells(img)

    if args.expect and len(cells) != args.expect:
        print(f"WARN найдено ячеек: {len(cells)}, ожидалось: {args.expect}", file=sys.stderr)

    names = [n.strip() for n in args.names.split(",") if n.strip()]
    written = []
    for i, box in enumerate(cells):
        name = names[i] if i < len(names) else f"{args.prefix}_{i + 1:02d}.jpg"
        written.append(export_cell(img, box, args.size, args.margin,
                                   os.path.join(args.out, name), args.quality))

    print(f"ячеек: {len(cells)}  сохранено: {len(written)}  → {args.out}")
    for p in written:
        print("  " + p)
    return 0 if not args.expect or len(cells) == args.expect else 2


if __name__ == "__main__":
    sys.exit(main())
