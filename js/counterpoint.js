/* 対位法（2声）の練習：定旋律（カントゥス・フィルムス）に対旋律をつけて、きまりを自動でチェックします。
   もとにしたもの：J. J. Fux『Gradus ad Parnassum』（1725）の「類（しゅ）」の考え方
   - 第1類：1対1（全音符に全音符）
   - 第2類：2対1（全音符に2分音符）
   - 第3類：4対1（全音符に4分音符）
   - 第4類：掛留（2分音符を小節線をこえてタイでつなぎ、小節の頭でずらす）
   check({ cf: [midi...（1小節に1音）], cp: [{s, p, l}], species: 1|2|3|4, above: true|false })
     → { issues: [{ level: 'err'|'warn'|'hint', rule, bar, bar2?, msg, note? }], stats, filled, total } */
const Counterpoint = (() => {
  const BAR = 192;
  const HALF = 96;
  const Q = 48;
  // Fux の定旋律（どれも白鍵だけ。さいごの音が主音）
  const CANTI = [
    { id: 'd', name: 'ドリア（レではじまる）・Fux', notes: [62, 65, 64, 62, 67, 65, 69, 67, 65, 64, 62] },
    { id: 'c', name: 'ハ長調・やさしい8小節', notes: [60, 62, 64, 62, 65, 64, 62, 60] },
    { id: 'e', name: 'フリギア（ミではじまる）・Fux', notes: [64, 60, 62, 60, 57, 69, 67, 64, 65, 64] },
    { id: 'f', name: 'リディア（ファではじまる）・Fux', notes: [65, 67, 69, 65, 62, 64, 65, 72, 69, 65, 67, 65] },
    { id: 'g', name: 'ミクソリディア（ソではじまる）・Fux', notes: [67, 72, 71, 67, 72, 76, 74, 79, 76, 72, 74, 71, 69, 67] },
    { id: 'a', name: 'エオリア（ラではじまる）・Fux', notes: [57, 60, 59, 62, 60, 64, 65, 64, 62, 60, 59, 57] },
  ];
  const QUAL = ['完全', '短', '長', '短', '長', '完全', '増', '完全', '短', '長', '短', '長'];
  const NUM = [1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7];
  // 半音の数 → 音程の名前（同度・長3度・完全5度・短10度 …）
  function ivName(semi) {
    const a = Math.abs(semi);
    const ic = a % 12;
    const oct = Math.floor(a / 12);
    if (a === 0) return '同度';
    if (ic === 0) return `完全${1 + 7 * oct}度`;
    return `${QUAL[ic]}${NUM[ic] + 7 * oct}度`;
  }
  const PERFECT = (ic) => ic === 0 || ic === 7;
  const CONSONANT = (ic) => [0, 3, 4, 7, 8, 9].includes(ic);
  const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const NOTE = ['ド', 'ド♯', 'レ', 'ミ♭', 'ミ', 'ファ', 'ファ♯', 'ソ', 'ソ♯', 'ラ', 'シ♭', 'シ'];
  const nm = (p) => NOTE[((p % 12) + 12) % 12];

  function check({ cf, cp, species = 1, above = true }) {
    const n = cf.length;
    const issues = [];
    const add = (level, rule, bar, msg, note, bar2) => issues.push({ level, rule, bar, bar2, msg, note });
    const total = n * BAR;
    // 1つの声部なので、同じ時に2つ以上の音があれば1つだけ（外がわの音）を見る
    const byS = new Map();
    for (const x of cp) {
      if (x.s < 0 || x.s >= total) continue;
      const o = byS.get(x.s);
      if (o) { if (!o.dupWarned) { add('warn', 'chord', Math.floor(x.s / BAR), `${Math.floor(x.s / BAR) + 1}小節：同じ時に音が2つあります。対旋律は1本のメロディなので、音は1つずつにします`, x); o.dupWarned = true; } if (above ? x.p > o.p : x.p < o.p) byS.set(x.s, { ...x, dupWarned: true }); } else byS.set(x.s, x);
    }
    let seq = [...byS.values()].sort((a, b) => a.s - b.s);
    if (species === 4) {
      // 2分音符で「弱拍の音」と「次の小節の頭の同じ音」を書いたときも、タイでつないだのと同じに見る
      const m = [];
      for (const x of seq) {
        const a = m[m.length - 1];
        if (a && a.p === x.p && x.s % BAR === 0 && a.s % BAR === HALF && a.s + a.l === x.s) m[m.length - 1] = { ...a, l: a.l + x.l };
        else m.push(x);
      }
      seq = m;
    }
    const starts = new Set(seq.map((x) => x.s));
    // 第4類：小節線をこえてのびている（次の小節の頭で、新しい定旋律の音とかさなる）
    const held = (x) => { const nb = (Math.floor(x.s / BAR) + 1) * BAR; return x.s % BAR !== 0 && x.s + x.l > nb && nb < total && !starts.has(nb); };
    const cfAt = (t) => cf[Math.floor(t / BAR)];
    const iv = (x) => (above ? x.p - cfAt(x.s) : cfAt(x.s) - x.p); // 上の声 − 下の声
    const barOf = (x) => Math.floor(x.s / BAR);
    const strong = (x) => x.s % BAR === 0;

    // ---- リズムの形 ----
    let filled = 0;
    for (let b = 0; b < n; b++) {
      const inBar = seq.filter((x) => barOf(x) === b);
      const want = species === 1 || b === n - 1 ? [0] : b === 0 ? null : species === 3 ? [0, Q, HALF, HALF + Q] : species === 4 ? [HALF] : [0, HALF];
      if (!inBar.length) continue;
      filled++;
      const pos = inBar.map((x) => x.s - b * BAR);
      if (species === 1 && (pos.length !== 1 || pos[0] !== 0)) add('warn', 'rhythm', b, `${b + 1}小節：第1類では、1小節に全音符を1つだけ（定旋律と同じ時に）おきます`, inBar[0]);
      if (species === 2) {
        const ok = want ? pos.length === want.length && pos.every((p, i) => p === want[i]) : (pos.length === 2 && pos[0] === 0 && pos[1] === HALF) || (pos.length === 1 && pos[0] === HALF);
        if (!ok) add('warn', 'rhythm', b, b === n - 1 ? `${b + 1}小節（さいご）：さいごは全音符1つでおわります` : `${b + 1}小節：第2類では、1小節に2分音符を2つ（1小節目は2分休符＋2分音符でもよい）`, inBar[0]);
      }
      if (species === 3) {
        const four = [0, Q, HALF, HALF + Q];
        const ok = b === n - 1 ? pos.length === 1 && pos[0] === 0 : (pos.length === 4 && pos.every((p, i) => p === four[i])) || (b === 0 && pos.length === 3 && pos.every((p, i) => p === four[i + 1]));
        if (!ok) add('warn', 'rhythm', b, b === n - 1 ? `${b + 1}小節（さいご）：さいごは全音符1つでおわります` : `${b + 1}小節：第3類では、1小節に4分音符を4つ（1小節目は4分休符からでもよい）`, inBar[0]);
      }
      if (species === 4) {
        const ok = b === n - 1 ? pos.length === 1 && pos[0] === 0 : pos.length === 1 && pos[0] === HALF;
        if (!ok) add('warn', 'rhythm', b, b === n - 1 ? `${b + 1}小節（さいご）：さいごは全音符1つでおわります` : `${b + 1}小節：第4類では、音は小節の2拍目（まん中）から出して、次の小節の頭までタイでのばします（1小節目は2分休符から）`, inBar[0]);
      }
    }

    // ---- たての音程（ひびき） ----
    seq.forEach((x, i) => {
      const b = barOf(x);
      const v = iv(x);
      const ic = Math.abs(v) % 12;
      if (v < 0) add('err', 'cross', b, `${b + 1}小節：声部の交差。対旋律（${above ? '上' : '下'}の声）が定旋律の${above ? '下' : '上'}にきています`, x);
      const first = i === 0;
      const last = b === n - 1;
      if (strong(x) || species === 1) {
        if (!CONSONANT(ic)) add('err', 'dis', b, `${b + 1}小節：${ivName(v)}は不協和音程（ぶつかる音）です。拍の頭は、3度・5度・6度・8度など、よくひびく音程（協和音程）にします`, x);
        else if (v === 0 && !first && !last) add('err', 'unison', b, `${b + 1}小節：同度（同じ高さ）は、はじめとおわりだけ。とちゅうでは2つの声が1つに聞こえてしまいます`, x);
      } else if (!CONSONANT(ic) && species === 4) {
        add('err', 'prep', b, `${b + 1}小節の2拍目：${ivName(v)}は不協和音程。第4類では、音を出す2拍目は協和音程にします（これが掛留の「準備」になります）`, x);
      } else if (!CONSONANT(ic)) {
        // 弱拍の不協和は「経過音」（順次進行で同じ向きに通りすぎる）ならよい。第3類は「刺繍音」「カンビアータ」もよい
        const a = seq[i - 1];
        const z = seq[i + 1];
        const st1 = a ? x.p - a.p : 0;
        const st2 = z ? z.p - x.p : 0;
        const step = (d) => Math.abs(d) >= 1 && Math.abs(d) <= 2;
        const passing = a && z && step(st1) && step(st2) && sgn(st1) === sgn(st2);
        const neighbor = species === 3 && a && z && step(st1) && step(st2) && z.p === a.p;
        const zz = seq[i + 2];
        const cambiata = species === 3 && x.s % BAR === Q && a && z && zz && st1 < 0 && step(st1) && (st2 === -3 || st2 === -4) && zz.p - z.p > 0 && step(zz.p - z.p);
        const beat = species === 3 ? `${(x.s % BAR) / Q + 1}拍目` : '2拍目';
        if (!passing && !neighbor && !cambiata) add('err', 'dis2', b, `${b + 1}小節の${beat}：${ivName(v)}は不協和音程。弱拍の不協和は「経過音」（となりの音へ同じ向きに順に進む）${species === 3 ? '・「刺繍音」（となりの音へ行って、もとの音へもどる）' : ''}のときだけ使えます`, x);
      }
      // 第4類：のばした音が、次の小節の頭で新しい定旋律の音とかさなる（掛留）
      if (species === 4 && held(x)) {
        const nb = b + 1;
        const v2 = above ? x.p - cf[nb] : cf[nb] - x.p;
        const ic2 = Math.abs(v2) % 12;
        const r = seq[i + 1];
        if (v2 < 0) add('err', 'cross', nb, `${nb + 1}小節の頭：のばした音が定旋律と交差しています`, x);
        else if (!CONSONANT(ic2)) {
          const d = r ? r.p - x.p : 0;
          const okRes = r && barOf(r) === nb && (d === -1 || d === -2);
          const rv = r ? (above ? r.p - cf[nb] : cf[nb] - r.p) : 0;
          if (!okRes) add('err', 'susp', nb, `${nb + 1}小節の頭：${ivName(v2)}の掛留（ぶつかる音）は、2拍目に「となりの音へ下がって」協和音程に解決します${r && d > 0 ? '。上へは解決できません' : ''}`, r && barOf(r) === nb ? r : x);
          else if (!CONSONANT(Math.abs(rv) % 12)) add('err', 'susp', nb, `${nb + 1}小節：掛留を解決した音（${ivName(rv)}）も不協和です。協和音程に解決します`, r);
          else if (!above && Math.abs(rv) % 12 === 0) add('err', 'susp', nb, `${nb + 1}小節：対旋律が下のとき、${ivName(v2)}→${ivName(rv)}（同度・8度への解決）はつかいません。2→3度、4→5度がよい掛留です`, r);
          else if (above && Math.abs(rv) % 12 === 0 && ic2 !== 2 && ic2 !== 1) add('err', 'susp', nb, `${nb + 1}小節：${ivName(v2)}→${ivName(rv)}の掛留はつかいません。上の声なら7→6度、4→3度、9→8度がよい掛留です`, r);
          else if (!above && Math.abs(rv) % 12 === 7 && ic2 !== 5 && ic2 !== 6) add('hint', 'susp', nb, `${nb + 1}小節：下の声の掛留は、2→3度・4→5度がよく使われます`, r);
        } else if (v2 === 0 && nb !== n - 1) add('err', 'unison', nb, `${nb + 1}小節の頭：同度（同じ高さ）は、はじめとおわりだけ`, x);
      }
    });

    // ---- はじめ・おわり ----
    if (seq.length) {
      const f = seq[0];
      const fv = Math.abs(iv(f)) % 12;
      if (barOf(f) === 0) {
        const okStart = above ? PERFECT(fv) : fv === 0;
        if (!okStart) add('err', 'start', 0, above ? '1小節目：はじまりは完全協和音程（同度・5度・8度）にします' : '1小節目：対旋律が下のときは、はじまりは同度か8度（5度だと調がちがって聞こえる）', f);
      }
      const last = seq[seq.length - 1];
      if (barOf(last) === n - 1) {
        const lv = iv(last);
        if (Math.abs(lv) % 12 !== 0) add('err', 'end', n - 1, `${n}小節（さいご）：おわりは同度か8度（主音どうし）にします。いまは${ivName(lv)}`, last);
        const pen = seq[seq.length - 2];
        if (pen && barOf(pen) === n - 2) {
          const step = last.p - pen.p;
          const cfStep = cf[n - 1] - cf[n - 2];
          if (!(Math.abs(step) >= 1 && Math.abs(step) <= 2 && sgn(step) === -sgn(cfStep))) add('warn', 'cadence', n - 2, `${n - 1}→${n}小節：おわり方（終止）は、定旋律と反対の向きに、となりの音へ進んでおわるのがきまりです`, pen, n - 1);
          const pv = Math.abs(iv(pen)) % 12;
          const wantIc = above ? 9 : 3;
          if (Math.abs(step) >= 1 && Math.abs(step) <= 2 && pv !== wantIc) add('hint', 'leading', n - 2, `${n - 1}小節：さいごの1つ前は${above ? '長6度' : '短3度'}にすると、主音へ半音で進む「導音」になって、きれいにおわれます（${nm(pen.p)}を半音上げてみよう）`, pen);
        }
      }
    }

    // ---- 2つの声の動き（平行・並達） ----
    let contrary = 0, similar = 0, oblique = 0, parallel = 0, run = 0, runIc = -1;
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1];
      const z = seq[i];
      if (z.s - (a.s + a.l) > 0 && species === 2 && !strong(z)) { /* 休符をはさむ */ }
      const dcp = z.p - a.p;
      const dcf = cfAt(z.s) - cfAt(a.s);
      const va = Math.abs(iv(a));
      const vz = Math.abs(iv(z));
      const ba = barOf(a);
      const bz = barOf(z);
      if (dcp === 0 && dcf === 0) continue;
      if (dcp === 0 || dcf === 0) oblique++;
      else if (sgn(dcp) !== sgn(dcf)) contrary++;
      else { similar++; if (va === vz) parallel++; }
      if (dcp !== 0 && dcf !== 0 && sgn(dcp) === sgn(dcf) && PERFECT(vz % 12)) {
        if (PERFECT(va % 12) && va % 12 === vz % 12) add('err', 'parallel', ba, `${ba + 1}→${bz + 1}小節：平行${vz % 12 === 7 ? '5度' : '8度'}。${vz % 12 === 7 ? '5度' : '8度（同度）'}のまま同じ向きに動くと、2つの声が1つにとけてしまうので禁止です`, z, bz);
        else {
          const upperLeap = above ? Math.abs(dcp) > 2 : Math.abs(dcf) > 2;
          // 第4類は2つの声が同時に動かないので、並達は見ない
          if (upperLeap && species !== 4) add('warn', 'hidden', ba, `${ba + 1}→${bz + 1}小節：並達（かくれた）${vz % 12 === 7 ? '5度' : '8度'}。同じ向きに動いて完全協和音程に入るときは、上の声を順次進行（となりの音）にします`, z, bz);
        }
      }
      // 3度・6度が4回以上つづく
      const icz = vz % 12;
      const cls = icz === 3 || icz === 4 ? 3 : icz === 8 || icz === 9 ? 6 : 0;
      if (cls && (species === 1 || strong(z))) {
        if (cls === runIc && sgn(dcp) === sgn(dcf) && dcp !== 0) run++; else run = 1;
        runIc = cls;
        if (run === 4) add('warn', 'many', bz, `${bz + 1}小節まで：${cls}度の平行が4回つづいています。3回までにして、反進行などをまぜると2つの声が独立して聞こえます`, z);
      } else if (species === 1 || strong(z)) { run = 0; runIc = -1; }
    }
    // 第2類：強拍どうしの平行5度・8度（間に1音あっても耳に残る）
    if (species === 2 || species === 3) {
      const downs = seq.filter(strong);
      for (let i = 1; i < downs.length; i++) {
        const a = downs[i - 1];
        const z = downs[i];
        if (barOf(z) !== barOf(a) + 1) continue;
        const va = Math.abs(iv(a));
        const vz = Math.abs(iv(z));
        const dcp = z.p - a.p;
        const dcf = cfAt(z.s) - cfAt(a.s);
        if (PERFECT(va % 12) && va % 12 === vz % 12 && dcp && dcf && sgn(dcp) === sgn(dcf) && !issues.some((x) => x.rule === 'parallel' && x.bar2 === barOf(z))) add('warn', 'parallel2', barOf(a), `${barOf(a) + 1}→${barOf(z) + 1}小節：強拍どうしが平行${va % 12 === 7 ? '5度' : '8度'}。間に音があっても、耳には平行に聞こえやすいです`, z, barOf(z));
      }
    }

    // ---- 旋律（対旋律そのもの）のきまり ----
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1];
      const z = seq[i];
      const m = z.p - a.p;
      const am = Math.abs(m);
      const b = barOf(z);
      const where = `${barOf(a) + 1}→${b + 1}小節`;
      if (am === 6) add('err', 'tritone', b, `${where}：増4度（三全音）の跳躍は歌いにくいので禁止です`, z);
      else if (am === 10 || am === 11) add('err', 'seventh', b, `${where}：7度の跳躍は禁止です`, z);
      else if (am > 12) add('err', 'big', b, `${where}：1オクターブより大きい跳躍は禁止です`, z);
      else if (am === 9) add('warn', 'sixth', b, `${where}：長6度の跳躍はさけます（短6度の上行はよい）`, z);
      else if (am === 8 && m < 0) add('warn', 'sixth', b, `${where}：6度の下行跳躍はさけます`, z);
      else if (am === 0) add('hint', 'repeat', b, `${where}：同じ音のくり返しは、メロディが止まって聞こえるので少なめに`, z);
      // 大きな跳躍のあとは、反対の向きへもどる
      const nx = seq[i + 1];
      if (am >= 5 && nx) {
        const m2 = nx.p - z.p;
        if (sgn(m2) === sgn(m) || m2 === 0) add('warn', 'leap', barOf(nx), `${b + 1}→${barOf(nx) + 1}小節：大きく跳んだ（${ivName(m)}）あとは、反対の向きへ順次進行でもどると自然です`, nx);
      }
    }
    if (seq.length >= 2) {
      const ps = seq.map((x) => x.p);
      const hi = Math.max(...ps);
      const lo = Math.min(...ps);
      if (hi - lo > 16) add('warn', 'range', 0, `対旋律の音域が${ivName(hi - lo)}あります。10度くらいまでにおさめると歌いやすくなります`);
      const far = seq.find((x) => Math.abs(iv(x)) > 16);
      if (far) add('warn', 'far', barOf(far), `${barOf(far) + 1}小節：2つの声が${ivName(iv(far))}もはなれています。10度くらいまでに`, far);
      if (above && seq.length >= 5 && n >= 6 && seq.filter((x) => x.p === hi && barOf(x) < n - 1).length > 1 && species === 1) add('hint', 'climax', 0, 'いちばん高い音（山）は1回だけにすると、メロディに形ができます');
    }
    // ---- 音階の外の音（白鍵＋シ♭＋さいごの導音はよい） ----
    const fin = cf[n - 1] % 12;
    for (const x of seq) {
      const pc = ((x.p % 12) + 12) % 12;
      const white = [0, 2, 4, 5, 7, 9, 11].includes(pc);
      const lead = pc === (fin + 11) % 12 && barOf(x) === n - 2;
      if (!white && pc !== 10 && !lead) add('warn', 'mode', barOf(x), `${barOf(x) + 1}小節：${nm(x.p)}は旋法（音階）の外の音です。半音上げてよいのは、おわりの1つ前（導音）だけ`, x);
    }
    const order = { err: 0, warn: 1, hint: 2 };
    issues.sort((a, b) => a.bar - b.bar || order[a.level] - order[b.level]);
    return { issues, stats: { contrary, similar, oblique, parallel }, filled, total: n, notes: seq.length };
  }

  // 短い名前（楽譜・ピアノロールの印に使う）
  const SHORT = { dis: '不協和', dis2: '不協和', unison: '同度', cross: '交差', start: 'はじまり', end: 'おわり', cadence: '終止', leading: '導音', parallel: '平行', parallel2: '強拍平行', hidden: '並達', many: '3度6度', tritone: '増4度', seventh: '7度', big: '大跳躍', sixth: '6度', repeat: 'くり返し', leap: '跳躍', range: '音域', far: 'はなれ', climax: '山', mode: '音階外', rhythm: 'リズム', chord: '和音', susp: '掛留', prep: '準備' };
  const RULES = {
    1: [
      'たての音程は協和音程だけ：同度・3度・5度・6度・8度（とそのオクターブ上）。2度・4度・7度・増4度はつかわない',
      'はじまりは完全協和（同度・5度・8度。対旋律が下なら同度か8度）、おわりは同度か8度',
      '平行5度・平行8度は禁止。同じ向きに動いて5度・8度に入るとき（並達）は、上の声をとなりの音へ',
      '同度はとちゅうでつかわない。3度・6度の平行は3回まで',
      '反進行（反対の向き）をたくさんつかうと、2つの声がよく聞こえる',
      'メロディ：増4度・7度・オクターブより大きい跳躍はだめ。大きく跳んだら、反対へもどる',
      'おわりは、となりの音から反対の向きに進んで主音へ（さいごの1つ前は、上なら長6度・下なら短3度）',
    ],
    2: [
      '1小節に2分音符を2つ（1小節目は2分休符からはじめてもよい）。さいごの小節は全音符',
      '強拍（小節の頭）は協和音程',
      '弱拍（2つめ）は協和音程か、経過音（となりの音へ同じ向きに通りすぎる不協和）',
      '平行5度・8度は禁止。強拍どうしの平行も、なるべくさける',
      'ほかは第1類と同じ（はじまり・おわり・跳躍のきまり）',
    ],
    3: [
      '1小節に4分音符を4つ（1小節目は4分休符からでもよい）。さいごの小節は全音符',
      '1拍目（小節の頭）は協和音程',
      'ほかの拍の不協和は、経過音（同じ向きに通りすぎる）か刺繍音（となりへ行って、もとの音へもどる）だけ',
      'カンビアータ：2拍目の不協和から3度下へ跳んで、となりの音へ上がる形もつかえる',
      '小節の頭どうしの平行5度・8度は、なるべくさける',
    ],
    4: [
      '音は小節の2拍目（まん中）で出して、次の小節の頭までタイでのばす（1小節目は2分休符から）。さいごの小節は全音符',
      '音を出す2拍目は協和音程（掛留の「準備」）',
      '小節の頭でぶつかったら（掛留）、2拍目にとなりの音へ下がって協和音程に「解決」する。上へは解決しない',
      '上の声のよい掛留：7→6度、4→3度（9→8度もつかえる）。下の声のよい掛留：2→3度、4→5度（7→8度はつかわない）',
      '小節の頭で協和音程なら、そのまま自由に次へ進んでよい',
      'おわりは、7→6度（上）や2→3度（下）の掛留から、主音の8度・同度へ',
    ],
  };
  return { check, CANTI, ivName, SHORT, RULES };
})();
if (typeof module !== 'undefined') module.exports = Counterpoint;
