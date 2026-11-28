// 印刷の楽譜を、用紙に合わせて組む（五線の大きさ・用紙をえらぶ）。画面（app.js）と、裏で組む作業（scoreworker.js）の両方で使う
// 使い方：ScoreFit.run(opts, { papers, target, auto, margin }) → { svg, layout, paperIdx, mm, scale }
const ScoreFit = (() => {
  const iw = (P, m) => P.w - 2 * m; // よはくの内がわのはば（mm）
  const ratio = (P, m) => (P.h - 2 * m) / iw(P, m); // ページの高さ ÷ はば
  // 1段がページに入る、いちばん大きな五線の大きさ（scale）。段の高さ（楽譜の単位）は、五線の大きさではほとんど変わらないので、1回組んだ地図から計算できる
  function fitScaleOf(L, OUTW, P, m, scaleNow) {
    if (!L || !L.systems.length) return scaleNow;
    const top0 = L.systems[0].y0;
    let need = 0;
    L.systems.forEach((sy, i) => { need = Math.max(need, (sy.y1 - sy.y0) + 34 + (i === 0 ? top0 : 46)); });
    // ページの高さ（単位）＝ (OUTW/scale)・比 ≧ need → scale ≦ OUTW・比 / need
    return (OUTW * ratio(P, m)) / need;
  }
  function fitToPaper(o, P, m, targetMm, L0) {
    const OUTW = o.width || 780;
    o.pageRatio = ratio(P, m);
    const want = targetMm ? (targetMm * OUTW) / (32 * iw(P, m)) : +o.scale || 1;
    let scale = Math.min(want, L0 ? fitScaleOf(L0, OUTW, P, m, want) * 0.99 : want);
    let svg = '';
    for (let it = 0; it < 3; it++) {
      o.scale = scale;
      svg = Notation.render(o);
      const f = fitScaleOf(Notation.lastLayout, OUTW, P, m, scale);
      if (scale <= f * 1.0005) break;
      scale = f * 0.99; // 段の組み方が変わって、少しはみ出した：もう一度
    }
    return { svg, mm: (32 * (+o.scale || 1) * iw(P, m)) / OUTW, scale };
  }
  function run(o, a) {
    const { papers, target, auto } = a;
    const m = a.margin || 12;
    const OUTW = o.width || 780;
    if (!auto) o.scale = +a.size || 1;
    // まず1回組んで段の高さを見て、どの用紙なら五線が 3mm 以上になるかを計算で決める（何度も組みなおさない）
    let L0 = null;
    let pi = 0;
    if (papers.length > 1 || auto) {
      o.scale = (target * OUTW) / (32 * iw(papers[0], m)) || 1;
      o.pageRatio = ratio(papers[0], m);
      Notation.render(o);
      L0 = Notation.lastLayout;
      for (let k = 0; k < papers.length; k++) {
        pi = k;
        const Q = papers[k];
        const mm = (32 * Math.min((target * OUTW) / (32 * iw(Q, m)), fitScaleOf(L0, OUTW, Q, m, 1)) * iw(Q, m)) / OUTW;
        if (mm >= 3) break;
      }
    }
    const r = fitToPaper(o, papers[pi], m, auto ? target : null, L0);
    return { svg: r.svg, layout: Notation.lastLayout, paperIdx: pi, mm: r.mm, scale: r.scale };
  }
  return { run, ratio, iw, fitScaleOf };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ScoreFit;
