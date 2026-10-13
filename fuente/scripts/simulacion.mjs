import { boot, clock } from '../test/harness.mjs';
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const DAY = 864e5, D0 = new Date(2026, 9, 12, 7, 0).getTime(); clock.t = D0;
const a = await boot(); const S = () => a.S; const subj = i => a.S.subjects[i].id;
const iso = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
await a.click('editGoals'); await a.submit({ target: '9', prevAvg: '8', pauDate: '2027-06-02' });
for (const [i, w] of [[0, '10'], [1, '12'], [2, '19'], [3, '26']]) { await a.click('addExam'); await a.submit({ subjectId: subj(i), when: w, learn: 'auto', amount: 'normal', prep: '1', difficulty: '3', importance: '4', goal: 'notable' }); }
for (const [i, w] of [[4, '3'], [5, '5'], [6, '7'], [7, '9'], [8, '14'], [4, '20']]) { await a.click('addTask'); await a.submit({ subjectId: subj(i), when: w, learn: 'auto', size: '3', difficulty: '3', importance: '3', pace: '1' }); }
await a.click('addTask'); await a.submit({ subjectId: subj(5), when: 'none', learn: 'auto', size: '3', difficulty: '2', importance: '3', pace: '1' });
for (let i = 0; i < 9; i++) for (let k = 0; k < 6; k++) { a.S.syllabus.push({ id: `t${i}_${k}`, subjectId: subj(i), name: `Tema ${k + 1} m${i}`, course: k < 3 ? 1 : 2, mastery: k % 4, reviews: 0, last: '2026-10-01', next: iso(D0 + (k % 5) * DAY), createdAt: i * 10 + k }); }
await a.t.commit({ quiet: true });
const issues = new Map(); const bad = (k, m) => { if (!issues.has(k)) issues.set(k, []); const l = issues.get(k); if (l.length < 3) l.push(m); };
const Q = { late: 0, holes: 0, loneShort: 0, studyDays: 0, blocks: 0 };
const stats = { days: 0, done: 0, skipped: 0, maxRev: 0, frag: 0, over: 0, total: 0 };
for (let day = 0; day < 35; day++) {
  clock.t = D0 + day * DAY; await a.t.commit({ quiet: true }); const today = iso(clock.t), Sx = a.S;
  const pl = Sx.blocks.filter(b => b.status === 'planned');
  // invariantes
  const byDate = {}; for (const b of Sx.blocks.filter(b => b.status === 'planned' || b.status === 'done')) (byDate[b.date] ??= []).push(b);
  for (const [d, bs] of Object.entries(byDate)) { bs.sort((x, y) => x.start - y.start); for (let i = 1; i < bs.length; i++) if (bs[i].start < bs[i - 1].end) bad('solape', `${d} ${bs[i - 1].id.slice(0, 30)} vs ${bs[i].id.slice(0, 30)}`);
    const wd = new Date(d + 'T00:00:00Z').getUTCDay(), av = Sx.settings.availability[wd] || [];
    for (const b of bs.filter(x => x.status === 'planned' && !x.manual)) if (!av.some(w => w.start <= b.start && b.end <= w.end)) bad('fuera de disponibilidad', `${d} ${b.start}-${b.end}`);
    const tot = bs.filter(x => x.status === 'planned').reduce((s, x) => s + x.end - x.start, 0); stats.total++; if (tot > Sx.settings.maxDayMin) { stats.over++; bad('sobre el tope', `${d} ${tot}`) } }
  for (const b of pl) { if (b.date < today) bad('sesión planificada en el pasado', b.id); if (b.end - b.start < 20) { stats.frag++; const w = Sx.works.find(x => x.id === b.workId); bad('fragmento <20', `${b.date} ${b.end - b.start}min ${w.title.slice(0,25)} est=${w.estMin} auto=${w.auto||''} kind=${w.kind}`) } }
  { const t = Sx.blocks.filter(b => b.date === today && b.status === 'planned').sort((x, y) => x.start - y.start), wd = new Date(today + 'T00:00:00Z').getUTCDay(), av = Sx.settings.availability[wd] || [];
    if (t.length) { Q.studyDays++; Q.blocks += t.length; if (t.length === 1 && t[0].end - t[0].start <= 30) Q.loneShort++; Q.late += t.filter(b => b.start >= 1230).length;
      for (let i = 1; i < t.length; i++) { const w1 = av.findIndex(w => w.start <= t[i - 1].start && t[i - 1].end <= w.end), w2 = av.findIndex(w => w.start <= t[i].start && t[i].end <= w.end); if (w1 === w2 && t[i].start - t[i - 1].end > 15) Q.holes++; } } }
  const ids = Sx.blocks.map(b => b.id); if (new Set(ids).size !== ids.length) bad('ids duplicados', today);
  for (const w of Sx.works.filter(w => w.status === 'done' || w.status === 'archived')) if (pl.some(b => b.workId === w.id)) bad('sesiones de trabajo terminado', w.title);
  stats.maxRev = Math.max(stats.maxRev, Sx.works.filter(w => w.auto === 'review' && w.status === 'pending').length);
  // el estudiante: de las sesiones de hoy hace ~70 %, el resto las deja pasar
  for (const b of Sx.blocks.filter(b => b.date === today && b.status === 'planned').sort((x, y) => x.start - y.start)) { if (rnd() < 0.7) { clock.t = D0 + day * DAY + b.end * 60000; await a.click('quickDone', b.id); stats.done++ } else stats.skipped++; }
  // idempotencia: recalcular dos veces no cambia
  clock.t = D0 + day * DAY + 23 * 3600000; await a.t.commit({ quiet: true }); const snap = JSON.stringify(a.S.blocks.map(b => [b.id, b.status, b.date, b.start])); await a.t.commit({ quiet: true }); await a.t.commit({ quiet: true });
  const snap2 = JSON.stringify(a.S.blocks.map(b => [b.id, b.status, b.date, b.start])); if (snap !== snap2) bad('no idempotente', today);
}
const Sx = a.S; const exams = Sx.works.filter(w => w.kind === 'exam');
console.log('STATS', JSON.stringify(stats)); console.log('CALIDAD', JSON.stringify(Q), '· bloques/día', (Q.blocks / Q.studyDays).toFixed(1)); for (const [k, v] of issues) console.log('ISSUE', k, v.length, v.join(' | '));
console.log('revisiones activas máx', stats.maxRev, '· repasos hechos', Sx.works.filter(w => w.auto === 'review' && w.status === 'done').length, '· temas con repaso vencido', Sx.syllabus.filter(t => t.mastery >= 1 && t.next && t.next < iso(clock.t)).length);
const done = Sx.blocks.filter(b => b.status === 'done'), sk = Sx.blocks.filter(b => b.status === 'skipped'), rs = Sx.blocks.filter(b => b.status === 'rescheduled');
console.log('bloques hechos', done.length, 'omitidos', sk.length, 'reprogramados', rs.length);
for (const w of Sx.works.filter(x => x.kind === 'exam')) console.log(' examen', w.title.slice(0, 22), w.dueDate, 'status', w.status, 'est', w.estMin, 'hechos', Sx.blocks.filter(b => b.workId === w.id && b.status === 'done').reduce((s, b) => s + (b.actualMin ?? 0), 0), 'plan', Sx.blocks.filter(b => b.workId === w.id && b.status === 'planned').reduce((s, b) => s + b.end - b.start, 0));
console.log('avisos', JSON.stringify((a.t.V.hoy().match(/No caben[^<]*/g) || []).slice(0, 3)));
