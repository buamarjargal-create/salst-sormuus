// Сэдвийн сан: сэдэв бүрийг ачаалж, 8 сурагчаар 4 шатыг бүтэн туулна. node test/topics.js
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3792, B = 'http://localhost:' + PORT, D = fs.mkdtempSync(path.join(os.tmpdir(), 'qt-'));
const p = spawn('node', [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT, DATA_DIR: D, NO_TUNNEL: '1', TEACHER_PASSWORD: 'Test12345' }, stdio: ['ignore', 'ignore', 'inherit'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('✗', m); } };
async function req(m, u, b, o = {}) { const h = { 'Content-Type': 'application/json' }; if (o.token) h['x-token'] = o.token; if (o.cookie) h.cookie = o.cookie; const r = await fetch(B + u, { method: m, headers: h, body: b === undefined ? undefined : JSON.stringify(b) }); let j = null; try { j = await r.json(); } catch (e) {} return Object.assign({ _s: r.status }, j || {}); }
function validQ(q) { const e = [];
  if (!q.text) e.push('текстгүй');
  if (q.type === 'mcq') { if (!(q.options.length >= 3 && q.correct >= 0 && q.correct < q.options.length)) e.push('mcq'); }
  else if (q.type === 'multi') { if (!(Array.isArray(q.correct) && q.correct.length && q.correct.every(i => i < q.options.length))) e.push('multi'); }
  else if (q.type === 'tf') { if (typeof q.correct !== 'boolean') e.push('tf'); }
  else if (q.type === 'order') { if (!(q.items.length >= 3)) e.push('order'); }
  else if (q.type === 'match') { if (!(q.pairs.length >= 3 && q.pairs.every(x => x.l && x.r))) e.push('match'); }
  else if (q.type === 'short') { if (!(q.keywords.length)) e.push('short'); }
  else e.push('төрөл ' + q.type);
  if (!q.explanation) e.push('тайлбаргүй'); return e; }
(async () => {
  await sleep(2500);
  const lr = await fetch(B + '/api/teacher/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'AmarjargalBuyanbaatar', password: 'Test12345' }) });
  const cookie = (lr.headers.get('set-cookie') || '').split(';')[0];
  const T = (u, b) => b === undefined ? req('GET', u, undefined, { cookie }) : req('POST', u, b, { cookie });
  const tl = await T('/api/t/topics'); ok(tl.ok && tl.topics.length === 14, 'сэдвийн тоо 14: ' + (tl.topics || []).length);
  ok(tl.topics[0].current, 'анхдагч Салст сэдэв идэвхтэй');
  for (const tp of tl.topics) {
    const r = await T('/api/t/topic', { key: tp.key }); ok(r.ok, 'ачаалсан ' + tp.key);
    let st = (await T('/api/t/state')).state;
    ok(st.settings.topic === tp.topic && st.students.length === 0 && st.t.phase === 'lobby', tp.key + ' төлөв');
    st.questions.forEach(q => { const e = validQ(q); ok(!e.length, tp.key + ' ' + q.id + ' ' + e.join(',')); });
    const per = s => st.questions.filter(q => q.active && q.stage === s).length;
    ok(per(1) === 6 && per(2) >= 1 && [1,2,3,4].every(t => st.questions.some(q => q.stage === 3 && q.team === t)) && per(4) === 4, tp.key + ' шатны бүтэц');
    ok(new Set(st.questions.map(q => q.id)).size === st.questions.length, tp.key + ' id давхардалгүй');
    const S = []; for (let i = 0; i < 8; i++) { let l = await req('POST', '/api/join', { name: 'Сурагч ' + i, cls: '10Д' }); while (l._s === 429) { await sleep(5000); l = await req('POST', '/api/join', { name: 'Сурагч ' + i, cls: '10Д' }); } S.push(l.token); }
    ok(S.every(Boolean), tp.key + ' сурагчид орсон');
    ok((await T('/api/t/control', { action: 'start' })).ok, tp.key + ' эхэлсэн');
    let guard = 0, answered = 0, errs = 0;
    while (guard++ < 80) {
      st = (await T('/api/t/state')).state; if (st.t.phase === 'done') break;
      for (const tok of S) { const v = (await req('GET', '/api/state', undefined, { token: tok })).state; const c = v.cur; if (!c || !c.q) continue;
        const q = c.q; let ans = null;
        if (q.type === 'mcq') ans = { i: q.options[0].i }; else if (q.type === 'multi') ans = { arr: [q.options[0].i] }; else if (q.type === 'tf') ans = { v: true };
        else if (q.type === 'order') ans = { arr: q.items.map(x => x.i) }; else if (q.type === 'match') ans = { arr: q.lefts.map((_, k) => q.rights[k].i) };
        if (c.ph === 'ind' && ans && !c.answered) { const a = await req('POST', '/api/answer', { qid: q.id, answer: ans, why: 'учир нь' }, { token: tok }); if (a.ok) answered++; else errs++; }
        else if (c.ph === 'team' && c.kind === 'write') await req('POST', '/api/team/answer', { qid: q.id, answer: { text: 'даралт мембран жижиг том' } }, { token: tok });
        else if (c.ph === 'team' && ans) await req('POST', '/api/team/answer', { qid: q.id, answer: ans, lock: true }, { token: tok });
        else if (c.ph === 'peer') await req('POST', '/api/peer', { vote: 'ok' }, { token: tok });
      }
      await T('/api/t/control', { action: 'next' });
    }
    st = (await T('/api/t/state')).state;
    ok(st.t.phase === 'done', tp.key + ' дууссан');
    ok(answered > 40 && errs === 0, tp.key + ' хариулт ' + answered + ' алдаа ' + errs);
    ok(st.teams.some(t => t.score > 0), tp.key + ' оноо');
    await T('/api/t/control', { action: 'reset' });
  }
  ok((await T('/api/t/topic', { key: 'байхгүй' }))._s === 404, 'буруу сэдэв');
  console.log('Сэдвийн шалгалт: ' + pass + ' ✓, ' + fail + ' ✗'); p.kill(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); p.kill(); process.exit(1); });
