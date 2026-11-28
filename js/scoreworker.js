// 裏で楽譜全体を組む（大きなオーケストラの曲でも、画面が止まらないように）
// うけとる：{ id, o（楽譜の設定）, a（用紙・五線の大きさ）, show（はじめに見せるページ数） }
// かえす：{ id, svg, pages, layout（段と小節の位置。絵の文字はのぞく）, paperIdx, mm, error }
importScripts('glyphs.js', 'notation.js', 'scorefit.js');
self.onmessage = (e) => {
  const { id, o, a } = e.data;
  try {
    const r = ScoreFit.run(o, a);
    const L = r.layout;
    const pages = Notation.paginate(r.svg, L, ScoreFit.ratio(a.papers[r.paperIdx], a.margin || 12));
    // 地図：段の絵（svg）と、関数（baseAt など）はおくらない
    const lay = JSON.parse(JSON.stringify({ ...L, headSvg: undefined, systems: L.systems.map((s) => ({ ...s, svg: undefined })) }));
    const counts = Notation.pageCounts(L, ScoreFit.ratio(a.papers[r.paperIdx], a.margin || 12));
    self.postMessage({ id, svg: r.svg, pages, layout: lay, paperIdx: r.paperIdx, mm: r.mm, counts });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
