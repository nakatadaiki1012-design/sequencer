"""本物の楽器の録音（FluidR3_GM, CC BY 3.0）をダウンロードして、アプリ用の samples/*.js を作るスクリプト。
使い方: python3 tools/build_samples.py <作業用フォルダ>
"""
import json, os, re, sys, urllib.request

MEL = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/{}-mp3.js'
DRUM = 'https://raw.githubusercontent.com/surikov/webaudiofontdata/master/sound/128{}_0_FluidR3_GM_sf2_file.js'
STEP = 3  # 3半音ごとに録音を使い、間の音は高さをずらして鳴らす

# アプリの楽器ID: (FluidR3の楽器名, 低い音, 高い音)
INSTS = {
    'piano': ('acoustic_grand_piano', 21, 108), 'epiano': ('electric_piano_1', 28, 103), 'epiano2': ('electric_piano_2', 28, 103),
    'clavinet': ('clavinet', 36, 96), 'harpsichord': ('harpsichord', 29, 89), 'organ': ('drawbar_organ', 24, 96),
    'pipeorgan': ('church_organ', 24, 96), 'accordion': ('accordion', 41, 89), 'kenhamo': ('harmonica', 53, 89),
    'celesta': ('celesta', 60, 108), 'glocken': ('glockenspiel', 53, 108), 'musicbox': ('music_box', 48, 108),
    'vibraphone': ('vibraphone', 53, 89), 'marimba': ('marimba', 36, 96), 'xylophone': ('xylophone', 53, 108),
    'tubularbell': ('tubular_bells', 48, 84), 'strings': ('string_ensemble_1', 28, 96), 'violin': ('violin', 55, 100),
    'cello': ('cello', 36, 76), 'contrabass': ('contrabass', 28, 67), 'pizz': ('pizzicato_strings', 28, 96),
    'harp': ('orchestral_harp', 24, 103), 'timpani': ('timpani', 36, 60), 'choir': ('choir_aahs', 40, 84),
    'trumpet': ('trumpet', 52, 86), 'trombone': ('trombone', 34, 77), 'horn': ('french_horn', 34, 77),
    'tuba': ('tuba', 24, 60), 'brassens': ('brass_section', 34, 86), 'sax': ('alto_sax', 49, 81),
    'oboe': ('oboe', 58, 91), 'clarinet': ('clarinet', 50, 91), 'bassoon': ('bassoon', 34, 75),
    'flute': ('flute', 60, 96), 'piccolo': ('piccolo', 74, 108), 'recorder': ('recorder', 60, 98),
    'ocarina': ('ocarina', 60, 96), 'acbass': ('acoustic_bass', 28, 67), 'guitar': ('acoustic_guitar_nylon', 40, 84),
    'steelguitar': ('acoustic_guitar_steel', 40, 84), 'eguitar': ('electric_guitar_clean', 40, 88),
    'rockguitar': ('distortion_guitar', 40, 88), 'ebass': ('electric_bass_finger', 28, 67), 'koto': ('koto', 48, 96),
    'shamisen': ('shamisen', 48, 88), 'shakuhachi': ('shakuhachi', 55, 91), 'steeldrum': ('steel_drums', 48, 96),
    'kalimba': ('kalimba', 48, 96), 'bagpipe': ('bagpipe', 55, 84), 'taikodrum': ('taiko_drum', 36, 72),
}
# 打楽器ID: GMドラムの番号
DRUMS = {
    'kick': 36, 'snare': 38, 'hihat': 42, 'ohat': 46, 'tomL': 45, 'tomH': 50, 'ride': 51, 'crash': 49,
    'odaiko': 35, 'kodaiko': 40, 'awase': 57, 'tamb': 54, 'castanet': 85, 'suzu': 83, 'triangle': 81, 'triMute': 80,
    'woodL': 77, 'woodH': 76, 'bongoL': 61, 'bongoH': 60, 'congaL': 64, 'congaH': 63, 'congaM': 62, 'cowbell': 56,
    'maracas': 70, 'clave': 75, 'guiro': 74, 'shaker': 82, 'agogoL': 68, 'agogoH': 67, 'clap': 39,
    'fuchi': 37, 'hyoshigi': 75, 'kane': 53, 'gong': 52, 'roll': 38, 'whistle': 71,
}
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

def get(url, cache):
    path = os.path.join(cache, re.sub(r'[^A-Za-z0-9_.-]', '_', url.split('/')[-1]))
    if not os.path.exists(path):
        with urllib.request.urlopen(url, timeout=120) as r, open(path, 'wb') as f:
            f.write(r.read())
    return open(path, encoding='utf-8').read()

def main():
    cache = sys.argv[1]
    os.makedirs(cache, exist_ok=True)
    out = os.path.join(os.path.dirname(__file__), '..', 'samples')
    os.makedirs(out, exist_ok=True)
    files = {}
    for iid, (gm, lo, hi) in INSTS.items():
        txt = get(MEL.format(gm), cache)
        notes = dict(re.findall(r'"([A-G]b?\d)":\s*"data:audio/mp3;base64,([^"]+)"', txt))
        pick = {}
        m = lo - (lo % STEP)
        while m <= hi + STEP:
            name = NAMES[m % 12] + str(m // 12 - 1)
            if name in notes and 21 <= m <= 108:
                pick[m] = notes[name]
            m += STEP
        if not pick:
            print('!! no notes', iid); continue
        with open(os.path.join(out, iid + '.js'), 'w') as f:
            f.write('Samples.add(%s,%s);\n' % (json.dumps(iid), json.dumps(pick, separators=(',', ':'))))
        files[iid] = os.path.getsize(os.path.join(out, iid + '.js'))
        print(iid, len(pick), 'notes', files[iid] // 1024, 'KB')
    drums = {}
    for did, n in DRUMS.items():
        try:
            txt = get(DRUM.format(n), cache)
        except Exception as e:
            print('!! drum missing', did, n, e); continue
        mm = re.search(r"file:'([^']+)'", txt)
        if mm: drums[did] = mm.group(1)
    with open(os.path.join(out, 'drums.js'), 'w') as f:
        f.write('Samples.addDrums(%s);\n' % json.dumps(drums, separators=(',', ':')))
    print('drums', len(drums), os.path.getsize(os.path.join(out, 'drums.js')) // 1024, 'KB')
    print('total MB', round((sum(files.values()) + os.path.getsize(os.path.join(out, 'drums.js'))) / 1e6, 1))

main()
