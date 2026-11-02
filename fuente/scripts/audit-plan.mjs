/* Auditor de calidad del plan: escenarios deterministas + métricas. Uso: node --no-warnings scripts/audit-plan.mjs [dist]
 * Métricas por examen: cobertura (planificado / necesidad recortada), peso de la víspera, reparto (días distintos / sesiones), capacidad desperdiciada. */
import { boot, clock } from '../test/harness.mjs';
const dist = process.argv[2];
const add = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) };
const DUE = { 'Matemáticas II': '2026-11-09', 'Química': '2026-11-10', 'Business': '2026-11-10', 'Lengua Castellana': '2026-11-11', 'Catalán': '2026-11-11', 'Inglés': '2026-11-12', 'Historia de España': '2026-11-12', 'Historia de la Filosofía': '2026-11-12', 'Física': '2026-11-13' };
async function scenario(name, setup) {
  clock.t = new Date(2026, 10, 2, 17, 17).getTime(); const a = await boot(dist ? { dist } : undefined);
  a.S.settings.availability[0] = a.S.settings.availability[6] = [{ start: 480, end: 810 }, { start: 900, end: 1020 }, { start: 1050, end: 1230 }]; a.S.settings.maxDayWeekend = 420;
  const sid = n => a.S.subjects.find(s => s.name === n).id;
  await setup(a, sid);
  const st = JSON.parse(JSON.stringify(a.S)); delete st.tmV; st.syllabus = []; const b = await boot({ ...(dist ? { dist } : {}), 'focusos.v1': JSON.stringify(st) });
  await b.click('replan'); return report(name, b);
}
function report(name, b) {
  const S = b.S, nm = id => S.subjects.find(s => s.id === id).name, rows = [];
  const exams = S.works.filter(w => w.kind === 'exam' && w.auto !== 'review' && !w.noPlan && (w.status === 'pending') && !w.provisional);
  let waste = 0;
  for (const w of exams) {
    const bl = S.blocks.filter(x => x.workId === w.id && x.status === 'planned'), tot = bl.reduce((s, x) => s + x.end - x.start, 0), need = w.estimate ? w.estimate.remainingMin : w.estMin;
    const eve = bl.filter(x => x.date === add(w.dueDate, -1)).reduce((s, x) => s + x.end - x.start, 0), days = new Set(bl.map(x => x.date)).size, ses = bl.length;
    rows.push({ examen: nm(w.subjectId).slice(0, 10), fecha: w.dueDate.slice(5), necesita: Math.round(need / 6) / 10, plan: Math.round(tot / 6) / 10, cob: +(tot / need).toFixed(2), vispera: tot ? +(eve / tot).toFixed(2) : 0, dias_ses: ses ? +(days / ses).toFixed(2) : 0 });
  }
  const last = exams.map(w => w.dueDate).sort().at(-1), byDay = {}; for (const x of S.blocks.filter(x => x.status === 'planned' && x.date >= '2026-11-02' && x.date <= last)) byDay[x.date] = (byDay[x.date] || 0) + x.end - x.start;
  const covs = rows.map(r => r.cob), min = Math.min(...covs), mean = covs.reduce((a, b) => a + b, 0) / covs.length, ev = Math.max(...rows.map(r => r.vispera));
  const tot = Object.values(byDay).reduce((a, b) => a + b, 0);
  console.log(`\n== ${name}`); console.table(rows);
  console.log(`cobertura mín ${min.toFixed(2)} · media ${mean.toFixed(2)} · víspera máx ${ev.toFixed(2)} · horas planificadas ${(tot / 60).toFixed(1)}`);
  return { min, mean, ev, tot };
}
const seedAll = async (a, sid) => { for (const [n, d] of Object.entries(DUE)) { await a.click('addExam'); await a.submit({ title: '', subjectId: sid(n), dueDate: d, time: '', estOverride: '', difficulty: '3', importance: '4', prep: '0', status: 'pending', notes: '' }) } };
await scenario('Semana de exámenes: 9 exámenes, todo en rojo', seedAll);
await scenario('Mitad en amarillo (Mates, Física, Química)', async (a, sid) => { await seedAll(a, sid); });
await scenario('Solo 4 exámenes repartidos', async (a, sid) => { for (const [n, d] of [['Matemáticas II', '2026-11-09'], ['Química', '2026-11-12'], ['Catalán', '2026-11-16'], ['Física', '2026-11-20']]) { await a.click('addExam'); await a.submit({ title: '', subjectId: sid(n), dueDate: d, time: '', estOverride: '', difficulty: '3', importance: '4', prep: '0', status: 'pending', notes: '' }) } });
