// パートごとに書き出す（ZIP）・ループの範囲だけ書き出す
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(800);
  const r = await p.evaluate(async () => {
    const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    loadSong(sampleSong()); song.tracks.forEach((t) => (t.real = false));
    const got = [];
    download = (blob, name) => got.push({ blob, name });
    const full = await renderSong();
    ui.loopOn = true; ui.loopRange = [0, 2];
    await exportWav();
    const wavLen = got[0].blob.size;
    ui.loopOn = false;
    await exportStems();
    const z = got[1];
    const bytes = new Uint8Array(await z.blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { '曲全体の長さ(秒)': +full.duration.toFixed(1), '範囲だけのWAV(秒)': +((wavLen - 44) / 4 / 44100).toFixed(1), zipName: z.name, zip: btoa(bin) };
  });
  fs.writeFileSync(`${OUT}/stems.zip`, Buffer.from(r.zip, 'base64'));
  delete r.zip;
  r['エラー'] = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
