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
r['音程の名前'] = [C.ivName(0), C.ivName(7), C.ivName(15), C.ivName(6)].join(' ');
console.log(JSON.stringify(r, null, 1));
