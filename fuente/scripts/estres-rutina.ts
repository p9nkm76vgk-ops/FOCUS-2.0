// Prueba de estrés del planificador + rutina (Node, sin DOM): acciones aleatorias del usuario y comprobación de invariantes tras CADA acción.
// Uso: node --no-warnings scripts/estres-rutina.ts [semillas]
import { proposeSchedule, DEFAULT_ROUTINE, mondayOf } from '../src/core/routine.ts';
import { DEFAULT_SETTINGS, addDays, weekday, EJERCICIO, CENA } from '../src/core/planner.ts';
import { DEFAULT_SUBJECT_COLORS as C } from '../src/core/palette.ts';
const names = Object.keys(C), subjects = names.map((n, i) => ({ id: 's' + i, name: n, colorKey: n }));
const SEEDS = +(process.argv[2] ?? 12), STEPS = 40; let bad = 0, checks = 0;
const mulberry = (a: number) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
const fail = (seed: number, step: number, msg: string) => { bad++; if (bad <= 400) console.log(`FALLO seed ${seed} paso ${step}: ${msg}`) };
for (let seed = 1; seed <= SEEDS; seed++) {
  const rnd = mulberry(seed * 7919); let works: any[] = [], blocks: any[] = [], habit: any[] = [], n = 0, now = { date: '2026-10-12', minute: 480 };
  const routine = { ...DEFAULT_ROUTINE, enabled: true, intensity: (['ligero', 'equilibrado', 'exigente'] as const)[seed % 3] };
  const run = (r = routine, h = habit) => proposeSchedule({ settings: DEFAULT_SETTINGS, subjects, works, blocks, activities: [], routine: r, habit: h, now });
  for (let step = 0; step < STEPS; step++) {
    const act = rnd();
    if (act < 0.3 || !works.length) { const s = subjects[Math.floor(rnd() * 9)], exam = rnd() < 0.35; works.push({ id: 'w' + n++, kind: exam ? 'exam' : 'task', subjectId: s.id, title: (exam ? 'Examen ' : 'Deberes ') + s.name, dueDate: addDays(now.date, 1 + Math.floor(rnd() * 12)), estMin: 30 + Math.floor(rnd() * (exam ? 300 : 120)), difficulty: 1 + Math.floor(rnd() * 5), importance: 1 + Math.floor(rnd() * 5), readiness: Math.floor(rnd() * 3), status: 'pending' }) }
    else if (act < 0.45) { const w = works[Math.floor(rnd() * works.length)]; w.dueDate = addDays(now.date, 1 + Math.floor(rnd() * 12)) }
    else if (act < 0.6) { const w = works[Math.floor(rnd() * works.length)]; w.status = 'done' }
    else if (act < 0.75) { const b = blocks.filter(x => x.status === 'planned' && x.date >= now.date); if (b.length) { const x = b[Math.floor(rnd() * b.length)]; x.status = rnd() < 0.7 ? 'done' : 'skipped'; if (x.status === 'skipped') x.reason = 'cansancio' } }
    else if (act < 0.85) { const h = habit.filter(x => x.status === 'planned' && x.date >= now.date); if (h.length) { const x = h[Math.floor(rnd() * h.length)]; const k = rnd(); x.status = k < 0.4 ? 'done' : k < 0.7 ? 'skipped' : 'planned'; x.pinned = k >= 0.7 } }
    else if (act < 0.95) { now = rnd() < 0.5 ? { date: now.date, minute: Math.min(1200, now.minute + 60 + Math.floor(rnd() * 240)) } : { date: addDays(now.date, 1), minute: 420 + Math.floor(rnd() * 600) } }
    const before = new Set([...blocks, ...habit].map((x: any) => x.id)), up5 = (m: number) => Math.ceil(m / 5) * 5, keepOf = (hh: any[]) => hh.filter((h: any) => h.date < now.date || (h.date === now.date && h.start < up5(now.minute)) || h.status === 'done' || h.status === 'skipped' || h.pinned), prevKeep = keepOf(habit); const r = run(); blocks = r.blocks; habit = r.habit; checks++;
    const occ = [...blocks.filter(b => b.status === 'planned' || b.status === 'done' || (b.status === 'skipped' && b.reason)), ...habit.filter(h => h.status === 'planned' || h.status === 'done')].filter(x => x.date >= now.date), fut = occ.filter(x => x.status !== 'skipped');
    // 1. nada tachado ni sin hueco
    if (habit.some(h => h.date >= now.date && (h.status === 'replaced' || h.status === 'displaced'))) fail(seed, step, 'bloque tachado/desplazado');
    // 2. sin solapes (obligaciones + rutina)
    for (const a of fut) for (const b of fut) if (a !== b && a.date === b.date && a.start < b.end && b.start < a.end) fail(seed, step, `solape ${a.id} / ${b.id}`);
    // 3. dentro de disponibilidad (salvo fijados por el usuario) y nunca en ejercicio ni cena
    for (const x of fut) { if (x.pinned || x.manual || x.status === 'done') continue; const av = DEFAULT_SETTINGS.availability[weekday(x.date)] ?? []; if (!av.some(w => w.start <= x.start && x.end <= w.end)) fail(seed, step, `fuera de disponibilidad ${x.id}`); if (x.start < EJERCICIO.end && x.end > EJERCICIO.start || x.end > CENA.start && x.start < CENA.end) fail(seed, step, `en ejercicio/cena ${x.id}`) }
    // 4. nada en el pasado
    for (const x of [...blocks.filter(b => b.status === 'planned'), ...habit.filter(h => h.status === 'planned')]) if (x.date < now.date && !x.past) { /* los planificados pasados son historial; el planificador no crea nuevos */ }
    for (const x of fut) if (!before.has(x.id) && x.date === now.date && x.start < now.minute && x.status === 'planned') fail(seed, step, `sesión nueva en el pasado ${x.id}`);
    // 5. estable: repetir con los mismos datos no cambia nada
    const r2 = run(routine, habit); if (JSON.stringify(r2.habit) !== JSON.stringify(habit) || JSON.stringify(r2.blocks.filter((b: any) => b.status === 'planned').map((b: any) => b.id).sort()) !== JSON.stringify(blocks.filter((b: any) => b.status === 'planned').map((b: any) => b.id).sort())) { fail(seed, step, 'no es estable al repetir'); if (process.env.DBG) { const A = (b: any[]) => b.filter((x: any) => x.status === 'planned').map((x: any) => x.id).sort(); const a1 = A(blocks), a2 = A(r2.blocks); console.log('now', JSON.stringify(now), 'solo1', a1.filter((x: string) => !a2.includes(x)), 'solo2', a2.filter((x: string) => !a1.includes(x)), 'habit diff', habit.filter((h: any) => !r2.habit.some((g: any) => g.id === h.id)).map((h: any) => [h.id, h.status]), r2.habit.filter((h: any) => !habit.some((g: any) => g.id === h.id)).map((h: any) => [h.id, h.status])); } }
    // 6. la rutina no provoca déficit
    const off = run({ ...routine, enabled: false }, prevKeep); const d = (x: any) => JSON.stringify(x.warnings.filter((w: any) => w.type === 'deficit').map((w: any) => w.deficitMin)); if (d(r) !== d(off)) fail(seed, step, `la rutina cambia el déficit ${d(off)} → ${d(r)}`);
    // 7. sin huecos > 15 min dentro de un mismo tramo, en días futuros (hoy puede tener huecos por sesiones ya hechas/omitidas)
    const byDay = new Map<string, any[]>(); for (const x of occ) if (x.date > now.date) byDay.set(x.date, [...(byDay.get(x.date) ?? []), x]);
    for (const [dd, xs] of byDay) { xs.sort((a, b) => a.start - b.start); const av = DEFAULT_SETTINGS.availability[weekday(dd)] ?? []; for (let i = 1; i < xs.length; i++) { const w1 = av.findIndex(w => w.start <= xs[i - 1].start && xs[i - 1].end <= w.end), w2 = av.findIndex(w => w.start <= xs[i].start && xs[i].end <= w.end); const gap = xs[i].start - xs[i - 1].end; if (w1 >= 0 && w1 === w2 && gap > 24 && xs[i].status === 'planned' && xs[i - 1].status === 'planned' && !xs[i].pinned && !xs[i - 1].pinned && !xs[i].manual) { fail(seed, step, `hueco de ${gap} min el ${dd} (${xs[i - 1].id} → ${xs[i].id})`); if (process.env.DBG) console.log(JSON.stringify({ now, day: occ.filter((x: any) => x.date === dd).map((x: any) => [x.id, x.start, x.end, x.status, x.manual, x.pinned]) })) } } }
  }
}
console.log(`${checks} estados comprobados en ${SEEDS} semillas · ${bad} fallos`); process.exit(bad ? 1 : 0);
