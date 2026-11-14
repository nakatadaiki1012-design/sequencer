#!/usr/bin/env python3
"""Build js/glyphs.js from the SMuFL font Bravura.

Downloads Bravura.otf + its SMuFL metadata (Bravura.json) + the SMuFL
glyphnames.json, extracts the outlines of the glyphs listed in GLYPHS and
writes them as SVG path data in staff-space units (y pointing DOWN, SMuFL
origin preserved).  Also writes fonts/OFL-Bravura.txt (the font licence).

Usage:  pip install fonttools
        python3 tools/build_glyphs.py [--cache DIR]

Bravura (c) Steinberg Media Technologies GmbH, SIL Open Font License 1.1.
"""
import argparse
import json
import os
import re
import sys
import tempfile
import urllib.request

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = 'https://raw.githubusercontent.com/steinbergmedia/bravura/master/'
SOURCES = {
    'Bravura.otf': RAW + 'redist/otf/Bravura.otf',
    'Bravura.json': RAW + 'redist/Bravura.json',          # SMuFL font metadata
    'LICENSE.txt': RAW + 'LICENSE.txt',
    'glyphnames.json': 'https://raw.githubusercontent.com/w3c/smufl/gh-pages/metadata/glyphnames.json',
}

GLYPHS = (
    'gClef fClef cClef unpitchedPercussionClef1 '
    'noteheadBlack noteheadHalf noteheadWhole noteheadXBlack noteheadXHalf noteheadCircleX '
    'restWhole restHalf restQuarter rest8th rest16th rest32nd '
    'flag8thUp flag8thDown flag16thUp flag16thDown flag32ndUp flag32ndDown '
    'accidentalSharp accidentalFlat accidentalNatural accidentalDoubleSharp accidentalDoubleFlat '
    + ' '.join('timeSig%d' % i for i in range(10)) +
    ' timeSigCommon timeSigCutCommon augmentationDot '
    'articAccentAbove articAccentBelow articStaccatoAbove articStaccatoBelow '
    'articTenutoAbove articTenutoBelow articMarcatoAbove articMarcatoBelow '
    'fermataAbove fermataBelow '
    'dynamicPiano dynamicMezzo dynamicForte dynamicSforzando dynamicZ dynamicRinforzando '
    'repeatDot segno coda brace tuplet3 '
    'metNoteQuarterUp metNoteHalfUp metNote8thUp metAugmentationDot '
    'keyboardPedalPed keyboardPedalUp '
    'ornamentTrill ornamentShortTrill ornamentMordent ornamentTurn ornamentTurnInverted '
    'breathMarkComma caesura wiggleArpeggiatoUp wiggleTrill '
    'articStaccatissimoAbove articStaccatissimoBelow tremolo1 tremolo2 tremolo3 '
    'stringsUpBow stringsDownBow graceNoteSlashStemUp'
).split()


def fetch(cache):
    os.makedirs(cache, exist_ok=True)
    for name, url in SOURCES.items():
        path = os.path.join(cache, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        print('download', url, file=sys.stderr)
        with urllib.request.urlopen(url, timeout=120) as r, open(path, 'wb') as f:
            f.write(r.read())
    return {k: os.path.join(cache, k) for k in SOURCES}


def num(v):
    """Round to 3 decimals and strip redundant characters (0.500 -> .5)."""
    s = ('%.3f' % v).rstrip('0').rstrip('.')
    if s in ('-0', ''):
        s = '0'
    s = re.sub(r'^(-?)0\.', r'\1.', s)
    return s


def join_nums(vals):
    out = ''
    for v in vals:
        s = num(v)
        # a separator is only needed when the next number does not start with '-'
        # and cannot be told apart (e.g. '.5' after '1.2' needs a space)
        if out and not s.startswith('-'):
            out += ' '
        out += s
    return out


def to_path(ops, scale):
    """Recording-pen ops (font units, y up) -> SVG d (spaces, y down), relative cmds."""
    d = []
    cx = cy = 0.0     # current point in rounded output units (avoid drift)
    sx = sy = 0.0

    def P(pt):
        return round(pt[0] * scale, 3), round(-pt[1] * scale, 3)

    for op, args in ops:
        if op == 'moveTo':
            x, y = P(args[0])
            d.append('m' + join_nums([x - cx, y - cy]) if d else 'M' + join_nums([x, y]))
            cx, cy = sx, sy = x, y
        elif op == 'lineTo':
            x, y = P(args[0])
            if y == cy:
                d.append('h' + join_nums([x - cx]))
            elif x == cx:
                d.append('v' + join_nums([y - cy]))
            else:
                d.append('l' + join_nums([x - cx, y - cy]))
            cx, cy = x, y
        elif op == 'curveTo':
            pts = [P(p) for p in args]
            if len(pts) != 3:
                raise ValueError('unexpected curveTo arity')
            vals = []
            for (x, y) in pts:
                vals += [x - cx, y - cy]
            d.append('c' + join_nums(vals))
            cx, cy = pts[-1]
        elif op == 'qCurveTo':
            # OTF/CFF has only cubics; kept for completeness (single quad)
            (x1, y1), (x, y) = P(args[0]), P(args[-1])
            d.append('q' + join_nums([x1 - cx, y1 - cy, x - cx, y - cy]))
            cx, cy = x, y
        elif op in ('closePath', 'endPath'):
            d.append('z')
            cx, cy = sx, sy
    return ''.join(d)


def pt(v):
    """SMuFL [x, y] (spaces, y up) -> [x, y] y down."""
    return [float(num(v[0])), float(num(-v[1]))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default=os.path.join(tempfile.gettempdir(), 'bravura-cache'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'js', 'glyphs.js'))
    args = ap.parse_args()

    src = fetch(args.cache)
    meta = json.load(open(src['Bravura.json'], encoding='utf-8'))
    names = json.load(open(src['glyphnames.json'], encoding='utf-8'))
    font = TTFont(src['Bravura.otf'])
    upem = font['head'].unitsPerEm
    scale = 4.0 / upem                      # 1 em = 4 staff spaces
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font['hmtx']

    glyphs, missing = {}, []
    for name in GLYPHS:
        info = names.get(name)
        gname = cmap.get(int(info['codepoint'][2:], 16)) if info else None
        if gname is None and name in gs:
            gname = name
        if gname is None:
            missing.append(name)
            continue
        pen = DecomposingRecordingPen(gs)
        gs[gname].draw(pen)
        bb = meta['glyphBBoxes'].get(name)
        if bb:
            bbox = [bb['bBoxSW'][0], -bb['bBoxNE'][1], bb['bBoxNE'][0], -bb['bBoxSW'][1]]
        else:
            bbox = [0, 0, 0, 0]
        w = meta.get('glyphAdvanceWidths', {}).get(name, hmtx[gname][0] * scale)
        glyphs[name] = {'d': to_path(pen.value, scale), 'w': float(num(w)),
                        'bbox': [float(num(v)) for v in bbox]}

    anchors = {}
    for name in GLYPHS:
        a = meta['glyphsWithAnchors'].get(name)
        if a and name in glyphs:
            anchors[name] = {k: pt(v) for k, v in sorted(a.items())}

    defaults = {k: v for k, v in meta['engravingDefaults'].items() if isinstance(v, (int, float))}

    def js(o):
        return json.dumps(o, separators=(',', ':'), ensure_ascii=False)

    lines = [
        '// glyphs.js — 楽譜記号（音部記号・音符の玉・休符・臨時記号・拍子記号など）の形のデータ。',
        '// tools/build_glyphs.py で自動生成。手で編集しないでください。',
        '// 形は SMuFL フォント Bravura から取り出したものです。',
        '// Bravura © Steinberg Media Technologies GmbH, SIL Open Font License 1.1',
        '// （ライセンス本文: fonts/OFL-Bravura.txt）',
        '// 単位: 1 = 五線の線と線の間（1スペース）。y は下向きが正。原点は SMuFL の定義どおり。',
        '// font: %s %s' % (meta.get('fontName'), meta.get('fontVersion')),
        '/* eslint-disable */',
        'const Glyphs = {',
        '  g: {',
    ]
    for name, g in glyphs.items():
        lines.append('    %s: {d:%s,w:%s,bbox:%s},' % (name, js(g['d']), num(g['w']), js(g['bbox'])))
    lines.append('  },')
    lines.append('  anchors: %s,' % js(anchors))
    lines.append('  defaults: %s,' % js(defaults))
    lines.append(r'''  // name の記号を (x, y) に、1スペース = sp px の大きさで描く <path> 文字列を返す
  svg(name, x, y, sp, attrs = '') {
    const g = this.g[name];
    if (!g) return '';
    const fill = /\bfill\s*=/.test(attrs) ? '' : ' fill="currentColor"';
    return `<path d="${g.d}" transform="translate(${x} ${y}) scale(${sp})"${fill} ${attrs}/>`;
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = Glyphs;
''')
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    lic = open(src['LICENSE.txt'], encoding='utf-8').read()
    os.makedirs(os.path.join(ROOT, 'fonts'), exist_ok=True)
    with open(os.path.join(ROOT, 'fonts', 'OFL-Bravura.txt'), 'w', encoding='utf-8') as f:
        f.write('Bravura music font (SMuFL) - outlines used in js/glyphs.js\n'
                'Copyright (c) Steinberg Media Technologies GmbH\n'
                'Source: https://github.com/steinbergmedia/bravura\n'
                'Licensed under the SIL Open Font License, Version 1.1 (text below).\n\n' + lic)

    print('wrote %s (%d bytes), %d glyphs' % (args.out, os.path.getsize(args.out), len(glyphs)))
    if missing:
        print('missing glyphs (skipped):', ' '.join(missing))


if __name__ == '__main__':
    main()
