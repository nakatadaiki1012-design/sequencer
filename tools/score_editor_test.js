const { chromium } = require('playwright');
(async () => { const SP=process.argv[2]; const b = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p = await b.newPage({ viewport:{width:1440,height:950} });
const errs=[]; p.on('pageerror', e => errs.push(e.message+' '+(e.stack||'').split('\n')[1])); p.on('dialog', d=>d.accept(d.type()==='prompt'?'さ':undefined));
await p.goto('http://localhost:8765/?notour'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1000);
await p.click('#viewSeg [data-v="score"]'); await p.waitForTimeout(400);
await p.screenshot({ path: SP + '/f1.png' });
// キーボードで入力：新しいトラックに
const r1 = await p.evaluate(() => { song.tracks[1].notes=[]; selectTrack(1); ui.sc.cursor=0; ui.sc.lastIns=null; changed(); return true; });
await p.waitForTimeout(200);
for (const k of ['4','c','d','e','f','3','g','a','5','g','0','6']) await p.keyboard.press(k);
await p.keyboard.press('Shift+C');
const n1 = await p.evaluate(() => JSON.stringify(song.tracks[1].notes.map(n=>[n.s,n.p,n.l])));
console.log('keyboard input', n1);
// 選択して上へ・スタッカート・強弱・スラー
await p.evaluate(() => { ui.sc.sel = new Set(['0:60','48:62']); });
await p.keyboard.press('ArrowUp');
await p.evaluate(() => { scArt('stac'); scDynamic('p'); ui.sc.sel=new Set(song.tracks[1].notes.filter(n=>n.s<192).map(n=>n.s+':'+n.p)); scSlur(); scHairpin('cresc'); });
console.log('after edit', await p.evaluate(() => JSON.stringify({n:song.tracks[1].notes.slice(0,3), dyn:song.tracks[1].dyn, sl:song.tracks[1].slurs, hp: song.tracks[1].hairpins})));
// クリックで入力（楽譜上の位置→高さ）
const clickRes = await p.evaluate(() => { const box=document.querySelector('#scoreEditView'); const L=box._layout; const sys=L.systems[0]; const st=sys.staves.find(s=>s.pi===scoreParts.indexOf(track())); const B=sys.bars[2]; const svg=box.querySelector('svg'); const r=svg.getBoundingClientRect(); const k=r.width/L.width;
  const x=B.xs[0]+2, y=st.top+4*8-2*4; // 第2線＝G4（ト音記号）
  const before=track().notes.length; ui.sc.input=true;
  scoreClick({clientX:r.left+x*k, clientY:r.top+y*k, target:svg, shiftKey:false}); return [before, track().notes.length, JSON.stringify(track().notes.find(n=>n.s===2*barTicks()))]; });
console.log('click insert', clickRes);
// くり返し：1〜2小節くり返し、playOrder
console.log('order', await p.evaluate(() => { song.repeats={start:[0],end:[3],volta:{3:1,4:2}}; changed(); return JSON.stringify(playOrder()); }));
// 強弱→音の大きさ
console.log('velocity', await p.evaluate(() => { const ex=expression(song.tracks[1]); return JSON.stringify(song.tracks[1].notes.slice(0,5).map(n=>{const x=ex(n);return [n.s, Math.round(x.v*100)/100, x.lf]})); }));
// 再生してハイライト
await p.evaluate(() => { song.repeats={start:[],end:[],volta:{}}; changed(); });
await p.click('#btnPlay'); await p.waitForTimeout(900);
console.log('playing highlights', await p.evaluate(() => document.querySelectorAll('#scoreEditView .nh.playing').length));
await p.screenshot({ path: SP + '/f2.png' });
await p.click('#btnPlay');
// MusicXML 往復
console.log('roundtrip', await p.evaluate(() => { song.repeats={start:[1],end:[2],volta:{}}; song.pickup=0; const o=scoreOpts(song.tracks.map(t=>t.id),true); o.chords=o.chordObjs; const xml=Notation.musicXML(o); const s2=MusicXMLImport.parse(xml,'x.musicxml'); const a=song.tracks[1].notes.map(n=>n.s+':'+n.p+':'+n.l).sort().join(); const m=s2.tracks.find(t=>t.name===song.tracks[1].name); const bb=m.notes.map(n=>n.s+':'+n.p+':'+n.l).sort().join(); return {same:a===bb, slurs:JSON.stringify(m.slurs), dyn:JSON.stringify(m.dyn), hp:JSON.stringify(m.hairpins), art: JSON.stringify(m.notes.filter(n=>n.art).map(n=>n.art)), rep: JSON.stringify(s2.repeats), drums: s2.tracks.filter(t=>t.type==='drum').map(t=>Object.keys(t.grid).join('/')).join()}; }));
// 大譜表・移調・伴奏の楽譜
await p.evaluate(() => { const S=scoreSettings(); S.accomp=true; S.clefs[song.tracks[0].id]='grand'; S.trans[song.tracks[1].id]=2; song.pickup=48; song.tempoText='Moderato'; changed(); });
await p.waitForTimeout(400);
await p.screenshot({ path: SP + '/f3.png' });
console.log('errors', errs); await b.close(); })();
