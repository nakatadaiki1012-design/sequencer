"""samples/*.js（base64 の MP3 が入った大きなファイル）から、1音ずつの MP3 ファイルを作るスクリプト。

  samples/mp3/<楽器>/<MIDI番号>.mp3   … 1音の録音
  samples/mp3/drums/<打楽器ID>.mp3   … 打楽器1つの録音
  samples/mp3/index.json              … どの音があるかの一覧

ffmpeg があれば、聞いて分からない程度に小さくし直します（モノラル・32kHz・ABR 48kbps・15kHz まで、
打楽器は 44.1kHz・64kbps。最後の無音を切って 30ms でフェードアウト）。ffmpeg が無いときは元の MP3 をそのまま書き出します。
アプリは http(s) ではこの mp3/ を使い、file:// では今までどおり samples/*.js を使います。

使い方: python3 tools/pack_samples.py [--copy] [--jobs N]
  --copy  ffmpeg を使わず元の MP3 をそのまま書き出す
"""
import base64, hashlib, json, os, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

try:
    import numpy as np
except ImportError:  # numpy が無いときは小さくし直さずに書き出す
    np = None

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'samples')
OUT = os.path.join(SRC, 'mp3')
IN_SR = 44100       # 元の録音のサンプリング周波数
# 楽器: モノラル 32kHz・ABR 48kbps・15kHz まで（LAME の初期設定だと 11kHz 付近で切られるので広げる）
# 打楽器: シンバルやハイハットは高い音が大事なので 44.1kHz・ABR 64kbps・18kHz まで（全部で 0.3MB ほど）
ENC = {'inst': (32000, '48k', 15000), 'drums': (44100, '64k', 18000)}
SILENCE_DB = -60    # ピークからこれより小さくなったら「無音」
TAIL = 0.05         # 無音になってから残す長さ（秒）
FADE = 0.03         # 最後のフェードアウト（秒）
MIN_LEN = 0.25      # これより短くは切らない（秒）
SILENT_PEAK = 0.003 # アプリと同じ: これより小さい録音は使わない


def read_js(path):
    t = open(path, encoding='utf-8').read()
    return json.loads(t[t.index('{'):t.rindex('}') + 1])


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def decode(ff, mp3):
    """MP3 → 44.1kHz ステレオの float 配列 (n, 2)"""
    p = subprocess.run([ff, '-v', 'error', '-i', 'pipe:0', '-ac', '2', '-ar', str(IN_SR), '-f', 'f32le', 'pipe:1'],
                       input=mp3, capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype='<f4').reshape(-1, 2).astype(np.float64)


def to_mono(x):
    """ステレオ → モノラル。FluidR3 の録音は右が少し遅れていることがあるので（ピアノは 0.7ms）、
    そのまま足すと特定の高さの音が打ち消し合う（くし形フィルタ）。ずれを合わせてから足し、
    左右それぞれの耳で聞こえていた大きさ（RMS）にそろえる。"""
    L, R = x[:, 0], x[:, 1]
    eL, eR = np.sum(L * L), np.sum(R * R)
    if eL == 0 or eR == 0:
        return L + R
    n = len(L)
    F = np.fft.rfft(L, 2 * n)
    G = np.fft.rfft(R, 2 * n)
    xc = np.fft.irfft(F * np.conj(G))
    MAXLAG = 64
    cand = np.r_[xc[:MAXLAG + 1], xc[-MAXLAG:]]
    lags = np.r_[np.arange(MAXLAG + 1), np.arange(-MAXLAG, 0)]
    i = int(np.argmax(cand))
    lag = int(lags[i]) if cand[i] / np.sqrt(eL * eR) > 0.3 else 0
    Rs = np.roll(R, lag)  # R を lag だけ遅らせる（lag<0 なら早める）
    if lag > 0:
        Rs[:lag] = 0
    elif lag < 0:
        Rs[lag:] = 0
    m = (L + Rs) / 2
    em = np.sum(m * m)
    if em > 0:
        m *= np.sqrt((eL + eR) / 2 / em)
    pk = np.max(np.abs(m))
    if pk > 0.99:
        m *= 0.99 / pk
    return m


def shrink(ff, mp3, kind='inst'):
    """1音を小さくし直す。戻り値: (mp3バイト列, ピーク) / 無音なら (None, peak)"""
    sr, br, cut = ENC[kind]
    x = to_mono(decode(ff, mp3))
    peak = float(np.max(np.abs(x[::16]))) if len(x) else 0.0
    if peak <= SILENT_PEAK:
        return None, peak
    # 10ms ごとのピークで、最後に音がある場所を探す
    thr = np.max(np.abs(x)) * 10 ** (SILENCE_DB / 20)
    win = IN_SR // 100
    nw = len(x) // win
    env = np.abs(x[:nw * win]).reshape(nw, win).max(axis=1)
    loud = np.nonzero(env > thr)[0]
    last = (int(loud[-1]) + 1) * win if len(loud) else 0
    n = min(len(x), max(int(MIN_LEN * IN_SR), last + int(TAIL * IN_SR)))
    y = x[:n].astype('<f4')
    f = min(int(FADE * IN_SR), n)
    y[n - f:] *= np.linspace(1, 0, f + 1)[1:].astype('<f4')
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
        out = tmp.name
    try:
        # ファイルに書くと LAME ヘッダ（先頭の遅れの情報）が入るので、鳴りはじめがずれない
        subprocess.run([ff, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(IN_SR), '-ac', '1', '-i', 'pipe:0',
                        '-ar', str(sr), '-c:a', 'libmp3lame', '-abr', '1', '-b:a', br, '-cutoff', str(cut), out],
                       input=y.tobytes(), check=True, capture_output=True)
        return open(out, 'rb').read(), peak
    finally:
        os.unlink(out)


def main():
    copy = '--copy' in sys.argv
    jobs = int(sys.argv[sys.argv.index('--jobs') + 1]) if '--jobs' in sys.argv else os.cpu_count() or 4
    ff = None if copy or np is None else ffmpeg()
    if not copy and not ff:
        print('ffmpeg か numpy が見つからないので、元の MP3 をそのまま書き出します（pip install imageio-ffmpeg で使えます）')
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    tasks = []  # (楽器 or 'drums', キー, 元のmp3)
    insts = sorted(f[:-3] for f in os.listdir(SRC) if f.endswith('.js') and f != 'drums.js')
    for inst in insts:
        for k, v in read_js(os.path.join(SRC, inst + '.js')).items():
            tasks.append((inst, k, base64.b64decode(v)))
    for k, v in read_js(os.path.join(SRC, 'drums.js')).items():
        tasks.append(('drums', k, base64.b64decode(v)))

    def work(t):
        inst, k, mp3 = t
        if ff:
            data, _ = shrink(ff, mp3, 'drums' if inst == 'drums' else 'inst')
            if data is None and inst == 'drums':
                data = mp3
        else:
            data = mp3
        if data is None:
            return inst, k, 0
        d = os.path.join(OUT, inst)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, k + '.mp3'), 'wb') as f:
            f.write(data)
        return inst, k, len(data)

    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(work, tasks))
    # v: 中身から作った番号。アプリは ?v=… を付けて読むので、作り直すと古いキャッシュは使われない
    h = hashlib.sha1()
    for inst, k, size in sorted(results):
        if size:
            h.update(f'{inst}/{k}:'.encode())
            h.update(open(os.path.join(OUT, inst, k + '.mp3'), 'rb').read())
    index = {'v': h.hexdigest()[:10], 'insts': {}, 'drums': []}
    for inst, k, size in results:
        if not size:
            continue
        if inst == 'drums':
            index['drums'].append(k)
        else:
            index['insts'].setdefault(inst, []).append(int(k))
    for v in index['insts'].values():
        v.sort()
    index['drums'].sort()
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, separators=(',', ':'))

    js = sum(os.path.getsize(os.path.join(SRC, f)) for f in os.listdir(SRC) if f.endswith('.js'))
    raw = sum(len(t[2]) for t in tasks)
    out = sum(r[2] for r in results)
    skipped = sum(1 for r in results if not r[2])
    print(f'samples/*.js (base64): {js / 1e6:.2f} MB')
    print(f'元の MP3 の合計:        {raw / 1e6:.2f} MB ({len(tasks)} 音)')
    print(f'samples/mp3/ の合計:    {out / 1e6:.2f} MB ({len(tasks) - skipped} 音, 無音で除いた音 {skipped})')


if __name__ == '__main__':
    main()
