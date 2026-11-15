// コードトラックを楽譜に：書き方をえらぶ（コード名だけ・スラッシュ・ピアノ譜）・コードトラックをえらぶ・伴奏の段をおしてコードを入れる
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 950 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const out = process.argv[2] || 'tools';
  await p.goto('http://localhost:8765/?notour'); await p.waitForTimeout(900);
  await p.evaluate(() => { const d = document.querySelector('#dlgStart'); if (d.open) d.close();
    const N = [60, 64, 67, 65, 64, 62, 60, 62, 64, 65, 67, 72, 71, 67, 65, 64].map((p, i) => ({ s: i * 48, p, l: 48 }));
    loadSong({ v: 2, title: 'コードの楽譜', bpm: 100, bars: 4, key: 0, tracks: [{ type: 'melody', inst: 'flute', notes: N }, { type: 'chord', inst: 'piano', pattern: 'beat', chords: [{ r: 0, q: 'M' }, { r: 5, q: 'M', h: { r: 7, q: '7' } }, { r: 9, q: 'm' }, { r: 7, q: '7' }] }] }, { own: true });
    selectTrack(0); setView('score'); });
  await p.waitForTimeout(300);
  const r = {};
  const parts = () => p.evaluate(() => scoreOpts(scoreEditIds(), true).parts.map((x) => x.name + (x.slash ? '(スラッシュ)' : x.clef === 'grand' ? '(大譜表)' : '')).join(' / '));
  r['メロディをえらんでいるとき'] = await p.evaluate(() => !!document.querySelector('#scAcc') && document.querySelector('#scAcc .on').textContent);
  r['はじめの楽譜'] = await parts();
  await p.click('#scAcc [data-a="slash"]'); await p.waitForTimeout(250);
  r['スラッシュ'] = await parts();
  await p.screenshot({ path: out + '/chord_slash.png', clip: { x: 280, y: 80, width: 1086, height: 600 } });
  await p.click('#scAcc [data-a="grand"]'); await p.waitForTimeout(250);
  r['ピアノ譜'] = await parts();
  // コードトラックをえらぶ（トラック欄から）
  await p.click('#trackList .track:nth-child(2) .tname'); await p.waitForTimeout(250);
  r['コードトラックをえらんだ'] = await p.evaluate(() => track().type + ' / 上の帯=' + !!document.querySelector('#scorePal .accrow.on'));
  await p.screenshot({ path: out + '/chord_grand.png', clip: { x: 280, y: 80, width: 1086, height: 860 } });
  // 伴奏の段（3小節目のあたり）をおす → その小節のコードのパネル
  const pos = await p.evaluate(() => {
    const v = document.querySelector('#scoreEditView'); const L = v._layout; const svg = v.querySelector('svg'); const R = svg.getBoundingClientRect(); const k = R.width / L.width;
    const pi = scoreParts.findIndex((t) => t.type === 'chord');
    const sys = L.systems[0]; const st = sys.staves.find((s) => s.pi === pi); const B = sys.bars.find((bb) => bb.b === 2);
    return { x: R.left + (B.x0 + 30) * k, y: R.top + (st.top + 12) * k };
  });
  await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(200);
  r['伴奏の段をおした'] = await p.evaluate(() => (ui.chd ? `パネル ${ui.chd.bar + 1}小節目 ${ui.chd.o / 48 + 1}拍目` : 'パネルなし'));
  await p.keyboard.press('Escape');
  // コード名だけにもどす
  await p.click('#scAcc [data-a="none"]'); await p.waitForTimeout(200);
  r['コード名だけ'] = await parts();
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  r['元にもどす'] = await parts();
  r.errs = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
