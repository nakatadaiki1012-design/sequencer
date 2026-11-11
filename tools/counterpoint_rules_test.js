// 対位法のチェック（ブラウザなしで node で動く）：Fux の模範はまちがい0、わざとのまちがいは見つける
const C = require('../js/counterpoint.js');
const cf = C.CANTI[0].notes;
const mk = (ps, d = 192) => ps.map((p, i) => ({ s: i * d, p, l: d }));
const errs = (r) => r.issues.filter((x) => x.level === 'err').map((x) => x.rule);
const r = {};
r['Fux の模範（第1類・上）まちがい0'] = errs(C.check({ cf, cp: mk([69, 69, 67, 69, 71, 72, 72, 71, 74, 73, 74]), species: 1, above: true })).length === 0;
r['平行5度を見つける'] = errs(C.check({ cf, cp: mk([69, 72, 71, 69, 74, 72, 76, 74, 72, 71, 74]), species: 1, above: true })).includes('parallel');
r['不協和を見つける'] = errs(C.check({ cf, cp: mk([69, 67, 67, 69, 71, 72, 72, 71, 74, 73, 74]), species: 1, above: true })).includes('dis');
r['おわりが8度でない'] = errs(C.check({ cf, cp: mk([69, 69, 67, 69, 71, 72, 72, 71, 74, 73, 69]), species: 1, above: true })).includes('end');
const h = [[null, 74], [69, 72], [67, 69], [71, 69], [71, 72], [74, 76], [77, 72], [74, 76], [74, 69], [71, 73]];
const n2 = []; h.forEach((pr, b) => pr.forEach((p, k) => { if (p != null) n2.push({ s: b * 192 + k * 96, p, l: 96 }); })); n2.push({ s: 1920, p: 74, l: 192 });
r['第2類の正しい例（経過音つき）まちがい0'] = C.check({ cf, cp: n2, species: 2, above: true }).issues.filter((x) => x.level !== 'hint').length === 0;
n2[4].p = 70; // 3小節の2拍目を、経過音でない不協和（増4度）に
r['第2類：経過音でない不協和を見つける'] = errs(C.check({ cf, cp: n2, species: 2, above: true })).includes('dis2');
// 第3類（4分音符）
const q = (bars, fin) => { const o = []; bars.forEach((ps, b) => ps.forEach((p, k) => o.push({ s: b * 192 + k * 48, p, l: 48 }))); o.push({ s: bars.length * 192, p: fin, l: 192 }); return o; };
const s3 = [[69, 71, 72, 71], [69, 71, 72, 71], [72, 71, 69, 67], [65, 69, 67, 69], [71, 72, 74, 72], [74, 72, 71, 69], [72, 74, 76, 72], [71, 72, 74, 71], [69, 71, 72, 74], [72, 76, 74, 73]];
const r3 = C.check({ cf, cp: q(s3, 74), species: 3, above: true });
r['第3類の正しい例（経過音・刺繍音）まちがい0'] = r3.issues.filter((x) => x.level !== 'hint').map((x) => x.msg).join(' / ') || true;
const s3b = s3.map((x) => x.slice()); s3b[2][1] = 74; // 3小節2拍目に、経過音でない不協和（7度）
r['第3類：経過音でない不協和を見つける'] = errs(C.check({ cf, cp: q(s3b, 74), species: 3, above: true })).includes('dis2');
// 第4類（掛留）
const sus = (ps) => ps.map((p, b) => (b === ps.length - 1 ? { s: b * 192, p, l: 192 } : { s: b * 192 + 96, p, l: b === ps.length - 2 ? 96 : 192 }));
const good4 = [69, 74, 72, 71, 74, 81, 77, 76, 74, 73, 74];
r['第4類の正しい例（7→6の掛留）まちがい・注意0'] = C.check({ cf, cp: sus(good4), species: 4, above: true }).issues.filter((x) => x.level !== 'hint').length === 0;
const split4 = []; good4.forEach((p, b) => { if (b === 10) split4.push({ s: 1920, p, l: 192 }); else { split4.push({ s: b * 192 + 96, p, l: 96 }); if (b < 9) split4.push({ s: (b + 1) * 192, p, l: 96 }); } });
r['第4類：2分音符2つで書いても同じにあつかう'] = C.check({ cf, cp: split4, species: 4, above: true }).issues.filter((x) => x.level !== 'hint').length === 0;
const up4 = good4.slice(); up4[2] = 76; // 7度の掛留を上へ解決
r['第4類：上への解決を見つける'] = errs(C.check({ cf, cp: sus(up4), species: 4, above: true })).includes('susp');
const prep4 = good4.slice(); prep4[1] = 72; // 準備が4度（不協和）… C5 vs F4
prep4[1] = 70;
r['第4類：準備の不協和を見つける'] = errs(C.check({ cf, cp: sus(prep4), species: 4, above: true })).some((x) => x === 'prep');
r['音程の名前'] = [C.ivName(0), C.ivName(7), C.ivName(15), C.ivName(6)].join(' ');
console.log(JSON.stringify(r, null, 1));
