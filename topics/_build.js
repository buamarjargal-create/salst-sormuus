'use strict';
// Сэдвийн асуултыг товч бичлэгээс сайтын асуултын бүтэц рүү хөрвүүлнэ.
// Товч түлхүүр: t төрөл, q асуулт, o сонголт, c зөв, i дараалал, p тааруулах хос [[зүүн, баруун]], k түлхүүр үг,
// e тайлбар, m буруу ойлголт, d ярилцах асуулт, n ойлголт, l түвшин 1..3, a сэдвийн бүлэг 1..4, g график, why, just.
function conv(x) {
  const q = { type: x.t, text: x.q, difficulty: x.l || 2, concept: x.n || '', explanation: x.e || '', misconception: x.m || '', discussion: x.d || '' };
  if (x.why) q.askWhy = true; if (x.just) q.askJustify = true; if (x.g) q.graph = x.g;
  if (x.t === 'mcq' || x.t === 'multi') { q.options = x.o; q.correct = x.c; }
  if (x.t === 'tf') q.correct = x.c;
  if (x.t === 'order') q.items = x.i;
  if (x.t === 'match') q.pairs = x.p.map(p => ({ l: p[0], r: p[1] }));
  if (x.t === 'short') q.keywords = x.k || [];
  return q;
}
// def: { key, grade, code, topic, teams:[[нэр-зорилго, онцлох агуулга] x4], areas:[x4], duel:[name,title], s1:[6], s2:[1], s3:[4], s4:[4], bank:[] }
function build(def) {
  const qs = [];
  def.s1.forEach((x, i) => qs.push(Object.assign(conv(x), { stage: 1, slot: i + 1, area: x.a || 1, team: 0 })));
  def.s2.forEach((x, i) => qs.push(Object.assign(conv(x), { stage: 2, slot: i + 1, area: x.a || 1, team: 0 })));
  def.s3.forEach((x, i) => qs.push(Object.assign(conv(x), { stage: 3, slot: i + 1, area: i + 1, team: i + 1 })));
  def.s4.forEach((x, i) => qs.push(Object.assign(conv(x), { stage: 4, slot: i + 1, area: i + 1, team: 0 })));
  (def.bank || []).forEach(x => qs.push(Object.assign(conv(x), { stage: 0, slot: 0, area: x.a || 0, team: 0 })));
  const questions = qs.map((q, i) => Object.assign({ id: 'Q' + String(i + 1).padStart(2, '0'), order: i + 1, active: true }, q));
  const areas = [''].concat(def.areas);
  const discussion = [{ min: '0–10', title: 'Сорилтын нэгтгэл', prompts: ['Аль асуулт хамгийн хэцүү байв? Яагаад?', 'Багийнхаа дотор санал зөрөхөд хэрхэн шийдсэн бэ?'] }]
    .concat(def.areas.map((a, i) => ({ min: (10 + i * 8) + '–' + (18 + i * 8), title: a, prompts: questions.filter(q => q.area === i + 1 && q.discussion).map(q => q.discussion).slice(0, 3) })));
  return {
    key: def.key, grade: def.grade, code: def.code, topic: def.topic, className: def.grade + '-р анги',
    teams: def.teams.map((t, i) => ({ name: 'Баг ' + (i + 1), mission: t[0], focus: t[1] })),
    areas, duel: { name: def.duel[0], title: def.duel[1] }, questions, discussion
  };
}
module.exports = { build };
