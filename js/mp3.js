// MP3 書き出し（lamejs を必要なときだけ読み込む）
//   MP3.ensure()                         -> Promise  エンコーダを読み込む
//   MP3.encode(audioBuffer, {kbps, onProgress}) -> Promise<Blob 'audio/mpeg'>
(function () {
  'use strict';

  // このスクリプトの場所から vendor のパスを決める（file:// でも動くように相対で）
  var here = document.currentScript && document.currentScript.src;
  var LAME_SRC = here ? new URL('vendor/lame.min.js', here).href : 'js/vendor/lame.min.js';
  var loading = null;

  function ensure() {
    if (window.lamejs && window.lamejs.Mp3Encoder) return Promise.resolve(window.lamejs);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = LAME_SRC;
      s.async = true;
      s.onload = function () {
        if (window.lamejs && window.lamejs.Mp3Encoder) resolve(window.lamejs);
        else { loading = null; reject(new Error('lamejs が見つかりません')); }
      };
      s.onerror = function () {
        loading = null; s.remove();
        reject(new Error('MP3 エンコーダの読み込みに失敗しました: ' + LAME_SRC));
      };
      document.head.appendChild(s);
    });
    return loading;
  }

  // Float32 (-1..1) → Int16（はみ出しはクリップ）
  function toInt16(src, start, len, out) {
    for (var i = 0; i < len; i++) {
      var v = src[start + i];
      if (v > 1) v = 1; else if (v < -1) v = -1;
      out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    return len === out.length ? out : out.subarray(0, len);
  }

  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  async function encode(audioBuffer, opts) {
    opts = opts || {};
    var kbps = opts.kbps || 128;
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    var lame = await ensure();

    var channels = audioBuffer.numberOfChannels >= 2 ? 2 : 1;
    var rate = audioBuffer.sampleRate;
    var total = audioBuffer.length;
    var left = audioBuffer.getChannelData(0);
    var right = channels === 2 ? audioBuffer.getChannelData(1) : null;

    var enc = new lame.Mp3Encoder(channels, rate, kbps);
    var BLOCK = 1152;
    var lBuf = new Int16Array(BLOCK), rBuf = new Int16Array(BLOCK);
    var parts = [];
    var yieldEvery = Math.max(BLOCK, Math.floor(rate * 0.5)); // 約 0.5 秒ごとに UI に処理を返す
    var sinceYield = 0;

    for (var pos = 0; pos < total; pos += BLOCK) {
      var n = Math.min(BLOCK, total - pos);
      var l = toInt16(left, pos, n, lBuf);
      var out = right ? enc.encodeBuffer(l, toInt16(right, pos, n, rBuf)) : enc.encodeBuffer(l);
      if (out.length) parts.push(new Uint8Array(out)); // コピー（内部バッファ再利用対策）
      sinceYield += n;
      if (sinceYield >= yieldEvery) {
        sinceYield = 0;
        if (opts.signal && opts.signal.aborted) throw new DOMException('やめました', 'AbortError');
        if (onProgress) onProgress(Math.min(1, (pos + n) / total));
        await tick();
      }
    }
    var tail = enc.flush();
    if (tail.length) parts.push(new Uint8Array(tail));
    if (onProgress) onProgress(1);
    return new Blob(parts, { type: 'audio/mpeg' });
  }

  window.MP3 = { ensure: ensure, encode: encode };
})();
