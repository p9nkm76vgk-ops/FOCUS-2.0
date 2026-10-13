/** Rutina semanal habitual. AMPLÍA el planificador existente (plan/capacityFor); no es otro motor.
 *  Tres tipos separados: obligaciones (works+blocks, prioridad), bloques de rutina (esto: sugeridos) y actividades opcionales. Determinista. */
import type { Activity, Block, HabitBlock, Now, Routine, Settings, Win, Work } from './types.ts';
import { addDays, weekday, subtract, plan } from './planner.ts';
import { METHOD, methodOf } from './method.ts';

export const DEFAULT_ROUTINE: Routine = { enabled: false, intensity: 'equilibrado', blockMin: 45, perWeek: {}, activeDays: [1, 2, 3, 4, 5, 6, 0], fixed: [], lastTopic: {}, quiet: [], generatedThrough: null };
export const INTENSITY = { ligero: { daily: 1, perWeek: 1, review: false }, equilibrado: { daily: 2, perWeek: 2, review: true }, exigente: { daily: 3, perWeek: 3, review: true } } as const;
export const HORIZON_DAYS = 14, REVIEW_MIN = 20;
export interface Subj { id: string; name: string; archived?: boolean; colorKey?: string; family?: string }
export interface Change { workId?: string; id: string; kind: 'sustituido' | 'reubicado' | 'pendiente'; subjectId: string; title: string; from: { date: string; start: number; end: number }; to?: { date: string; start: number; end: number }; reason: string }
const up5 = (m: number) => Math.ceil(m / 5) * 5, dur = (b: { start: number; end: number }) => b.end - b.start;
const fm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const mondayOf = (d: string) => addDays(d, -((weekday(d) + 6) % 7));
const byDT = (a: { date: string; start: number }, b: { date: string; start: number }) => a.date.localeCompare(b.date) || a.start - b.start;

const T: Record<string, [string, string][]> = Object.fromEntries(Object.entries(METHOD).map(([k, m]) => [k, m.tasks.map(t => [t.title, t.detail + ' Por qué: ' + m.why] as [string, string])]));
const G: [string, string][] = [['Repasar el último tema', 'Recupera de memoria lo esencial sin mirar los apuntes y comprueba después.'], ['Ejercicios del material disponible', 'Resuelve ejercicios del material que tengas y anota las dudas.'], ['Identificar lagunas', 'Escribe tres cosas que no tengas claras y busca cómo resolverlas.']];
/** Actividad genérica y adaptable. NO inventa temario: solo cita el tema si el usuario lo indicó. */
export function activityFor(s: Subj, n: number, topic?: string) {
  const list = (s.colorKey && T[s.colorKey]) || T[s.name] || G, [title, detail] = list[n % list.length];
  return { title: `${s.name}: ${title}`, detail: topic ? `${detail} Tema indicado por ti: ${topic}.` : detail };
}

type Busy = { date: string; start: number | null; end: number | null; status: string };
export const fixedBusy = (r: Routine, from: string, days: number): (Busy & { name: string })[] => {
  const out: (Busy & { name: string })[] = [];
  for (let i = 0; i < days; i++) { const d = addDays(from, i), wd = weekday(d); for (const f of r.fixed) if (f.days.includes(wd)) out.push({ date: d, start: f.start, end: f.end, status: 'planned', name: f.name }); }
  return out;
};
export const habitBusy = (h: HabitBlock[]): Busy[] => h.filter(x => x.status === 'planned' || x.status === 'done').map(x => ({ date: x.date, start: x.start, end: x.end, status: 'planned' }));

interface Ctx { settings: Settings; routine: Routine; blocks: Block[]; activities: Activity[]; habit: HabitBlock[]; now: Now }
function cuts(c: Ctx, date: string, ign?: { block?: string; habit?: string }): Win[] {
  const g = c.settings.minGapMin, pd = (b: { start: number; end: number }) => ({ start: b.start - g, end: b.end + g });
  return [...c.settings.blockedDates.filter(b => b.date === date), ...c.blocks.filter(b => b.date === date && (b.status === 'planned' || b.status === 'done' || (b.status === 'skipped' && !!b.reason && date >= c.now.date)) && b.id !== ign?.block).map(pd),
    ...c.activities.filter(a => a.date === date && a.status !== 'skipped' && a.start != null).map(a => pd({ start: a.start!, end: a.end! })),
    ...fixedBusy(c.routine, date, 1).map(f => pd({ start: f.start!, end: f.end! })), ...c.habit.filter(h => h.date === date && (h.status === 'planned' || h.status === 'done') && h.id !== ign?.habit).map(pd)];
}
const windows = (c: Ctx, date: string, ign?: { block?: string; habit?: string }): Win[] => { const x = cuts(c, date, ign); if (date === c.now.date) x.push({ start: 0, end: up5(c.now.minute) }); return subtract(c.settings.availability[weekday(date)] ?? [], x); };
const clash = (c: Ctx, date: string, s: number, e: number, ign?: { block?: string; habit?: string }) => cuts(c, date, ign).some(w => w.start < e && s < w.end);
const inAvail = (c: Ctx, date: string, s: number, e: number) => (c.settings.availability[weekday(date)] ?? []).some(w => w.start <= s && e <= w.end);

/** Genera SOLO bloques nuevos entre `from` y `to` (nunca borra ni mueve los existentes). Idempotente: no repite lo ya generado. */
export function generate(i: { settings: Settings; routine: Routine; subjects: Subj[]; works: Work[]; blocks: Block[]; activities: Activity[]; habit: HabitBlock[]; now: Now; from: string; to: string }): HabitBlock[] {
  const R = i.routine, I = INTENSITY[R.intensity], subs = i.subjects.filter(s => !s.archived), all = [...i.habit], out: HabitBlock[] = [];
  const c: Ctx = { settings: i.settings, routine: R, blocks: i.blocks, activities: i.activities, habit: all, now: i.now };
  const last: Record<string, string> = {};
  for (const b of i.blocks) if (b.status === 'done') { const w = i.works.find(x => x.id === b.workId); if (w && b.date > (last[w.subjectId] ?? '')) last[w.subjectId] = b.date; }
  for (const h of i.habit) if (h.status === 'done' && h.date > (last[h.subjectId] ?? '')) last[h.subjectId] = h.date;
  const quota = (sid: string) => Math.max(0, R.perWeek[sid] ?? I.perWeek);
  for (let d = i.from; d <= i.to; d = addDays(d, 1)) {
    if (d < i.now.date || !R.activeDays.includes(weekday(d))) continue;
    const mon = mondayOf(d), have = (sid: string) => all.filter(h => h.subjectId === sid && h.kind === 'estudio' && h.status !== 'displaced' && mondayOf(h.date) === mon).length;
    const today = all.filter(h => h.date === d && h.status !== 'displaced'), used = new Set(today.map(h => h.subjectId)), prev = new Set(all.filter(h => h.date === addDays(d, -1) && h.kind === 'estudio').map(h => h.subjectId));
    let cap = I.daily - today.filter(h => h.kind === 'estudio').length;
    // Días activos que quedan en la semana (hoy incluido): si una asignatura necesita tantos bloques como días quedan, HAY que ponerla hoy aunque ayer también toque (p. ej. 5 clases por semana).
    let dl = 0; for (let e = d; e <= addDays(mon, 6); e = addDays(e, 1)) if (e >= i.now.date && R.activeDays.includes(weekday(e))) dl++;
    // «Más antigua primero» cuenta también lo ya planificado (no solo lo hecho): así las asignaturas rotan en vez de ganar siempre las primeras de la lista.
    const seen = (sid: string) => all.reduce((m, h) => h.subjectId === sid && h.status !== 'displaced' && h.date < d && h.date > m ? h.date : m, last[sid] ?? '');
    const cand = subs.filter(s => quota(s.id) - have(s.id) > 0 && !used.has(s.id)).map(s => ({ s, k: [quota(s.id) - have(s.id) >= dl ? 0 : prev.has(s.id) ? 1 : 0, -quota(s.id), -(quota(s.id) - have(s.id)), seen(s.id), subs.indexOf(s)] as const }))
      .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2] || a.k[3].localeCompare(b.k[3]) || a.k[4] - b.k[4]);
    const place = (s: Subj, min: number, kind: 'estudio' | 'repaso') => {
      const w = windows(c, d).find(x => x.end - up5(x.start) >= min); if (!w) return false;
      const st = up5(w.start), n = all.filter(h => h.subjectId === s.id && h.kind === 'estudio').length;
      const a = kind === 'estudio' ? activityFor(s, n, R.lastTopic[s.id]) : (() => { const m = methodOf(s.name, s.colorKey); return { title: `${s.name}: ${m.repaso.title}`, detail: `${m.repaso.detail} Por qué: recuperar de memoria y espaciar es la técnica mejor respaldada.` }; })();
      const h: HabitBlock = { id: `hab:${d}:${st}:${s.id}`, date: d, start: st, end: st + min, subjectId: s.id, kind, title: a.title, detail: a.detail, status: 'planned', pinned: false };
      all.push(h); out.push(h); used.add(s.id); return true;
    };
    for (const x of cand) { if (cap <= 0) break; if (!place(x.s, R.blockMin, 'estudio')) break; cap--; used.add(x.s.id); }
    if (I.review && !all.some(h => h.date === d && h.kind === 'repaso')) {
      const cnt = (sid: string) => all.filter(h => h.subjectId === sid && h.status !== 'displaced' && mondayOf(h.date) === mon).length;
      const r = subs.filter(s => !used.has(s.id) && quota(s.id) > 0).sort((a, b) => cnt(a.id) - cnt(b.id) || seen(a.id).localeCompare(seen(b.id)) || subs.indexOf(a) - subs.indexOf(b))[0];
      if (r && all.filter(h => h.date === d && h.status !== 'displaced').length < I.daily + 1) place(r, REVIEW_MIN, 'repaso');
    }
  }
  return out;
}

/** Adaptación a obligaciones: SUSTITUYE el bloque habitual de la misma asignatura por los deberes (si encaja) y, en modo 'soft', REUBICA los bloques
 *  desplazados por una obligación. Nunca toca bloques hechos, fijados ni manuales. Solo cambia lo necesario. */
export function reconcile(i: Ctx & { works: Work[]; mode: 'keep' | 'soft'; absorb?: boolean; declined?: string[] }) {
  const habit = i.habit.map(h => ({ ...h })), blocks = i.blocks.map(b => ({ ...b })), changes: Change[] = [], c: Ctx = { ...i, habit, blocks };
  const active = i.works.filter(w => w.status === 'pending' || w.status === 'in_progress').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  for (const w of i.absorb === false ? [] : active) {
    const lastOk = w.kind === 'exam' ? addDays(w.dueDate, -1) : w.dueDate;
    for (const b of blocks.filter(x => x.workId === w.id && x.status === 'planned' && !x.manual && x.part !== 'review' && x.date >= i.now.date).sort(byDT)) {
      const bd = dur(b), h = habit.filter(x => x.status === 'planned' && !x.pinned && x.kind === 'estudio' && x.subjectId === w.subjectId && x.date >= i.now.date && x.date <= lastOk && x.date <= b.date && bd * 2 >= dur(x) && !(i.declined ?? []).includes(`${w.id}|${x.id}`)).sort(byDT)
        .find(x => (x.date !== i.now.date || x.start >= up5(i.now.minute)) && inAvail(c, x.date, x.start, x.start + bd) && !clash(c, x.date, x.start, x.start + bd, { block: b.id, habit: x.id }));
      if (!h) continue;
      b.date = h.date; b.start = h.start; b.end = h.start + bd; b.id = `auto:${w.id}:${b.part ?? 'main'}:${b.date}:${b.start}`;
      changes.push({ workId: w.id, id: h.id, kind: 'sustituido', subjectId: h.subjectId, title: h.title, from: { date: h.date, start: h.start, end: h.end }, reason: `Sustituido por «${w.title}» (misma asignatura, vence ${w.dueDate}).` });
      h.status = 'replaced'; h.note = `Sustituido por «${w.title}»`;
    }
  }
  if (i.mode === 'soft') for (const h of habit.filter(x => x.status === 'planned' && !x.pinned && x.date >= i.now.date).sort(byDT)) {
    if (!clash(c, h.date, h.start, h.end, { habit: h.id })) continue;
    const from = { date: h.date, start: h.start, end: h.end }, d0 = dur(h); let moved = false;
    for (let k = 0; k <= 3 && !moved; k++) { const d = addDays(from.date, k), w = windows(c, d, { habit: h.id }).find(x => x.end - up5(x.start) >= d0 && !(d === from.date && up5(x.start) === h.start));
      if (w) { const st = up5(w.start); h.date = d; h.start = st; h.end = st + d0; h.id = `hab:${d}:${st}:${h.subjectId}`; h.note = 'Reubicado por una obligación'; changes.push({ id: h.id, kind: 'reubicado', subjectId: h.subjectId, title: h.title, from, to: { date: d, start: st, end: st + d0 }, reason: 'Se solapaba con una obligación; hay un hueco razonable.' }); moved = true; } }
    if (!moved) { h.status = 'displaced'; h.note = 'Sin hueco razonable: decide qué hacer'; changes.push({ id: h.id, kind: 'pendiente', subjectId: h.subjectId, title: h.title, from, reason: 'Se solapaba con una obligación y no hay hueco razonable en los próximos días.' }); }
  }
  return { habit, blocks, changes };
}

/** Propone el horario completo. 1º respeta la rutina como ocupada; solo si no cabe y desplazarla reduce el déficit, propone reubicarla. */
export function proposeSchedule(i: { settings: Settings; works: Work[]; blocks: Block[]; boost?: Record<string, number>; avoid?: { hours: number[]; days: number[] }; activities: Activity[]; routine: Routine; habit: HabitBlock[]; now: Now; quiet?: boolean; declined?: string[] }) {
  const fx = fixedBusy(i.routine, i.now.date, i.settings.horizonDays + 2), deficits = (w: { type: string }[]) => w.filter(x => x.type === 'deficit').length;
  const run = (mode: 'keep' | 'soft') => { const p = plan({ settings: i.settings, works: i.works, blocks: i.blocks, boost: i.boost, avoid: i.avoid, activities: [...i.activities, ...fx, ...(mode === 'keep' ? habitBusy(i.habit) : [])] }, i.now);
    return { p, r: reconcile({ settings: i.settings, routine: i.routine, works: i.works, blocks: p.blocks, activities: i.activities, habit: i.habit, now: i.now, mode, absorb: !i.quiet, declined: i.declined }) }; };
  let pick = run('keep'), mode: 'keep' | 'soft' = 'keep'; const dA = deficits(pick.p.warnings);
  if (dA > 0 && i.routine.enabled && !i.quiet) { const B = run('soft'); if (deficits(B.p.warnings) < dA) { pick = B; mode = 'soft'; } }
  return { blocks: pick.r.blocks, habit: pick.r.habit, warnings: pick.p.warnings, changes: pick.r.changes, mode };
}
/** Regenera la rutina futura: conserva hechos, fijados, omitidos y sustituidos; retira lo demás y vuelve a generar. */
export function regenerate(i: { settings: Settings; routine: Routine; subjects: Subj[]; works: Work[]; blocks: Block[]; activities: Activity[]; habit: HabitBlock[]; now: Now }) {
  const keep = i.habit.filter(h => h.date < i.now.date || h.status === 'done' || h.status === 'skipped' || h.status === 'replaced' || h.pinned);
  const to = addDays(i.now.date, HORIZON_DAYS - 1);
  return { habit: [...keep, ...generate({ ...i, habit: keep, from: i.now.date, to })].sort(byDT), through: to };
}
export const describe = (c: Change, name: string) => `${name} ${fm(c.from.start)}–${fm(c.from.end)}${c.to ? ` → ${c.to.date === c.from.date ? '' : c.to.date.slice(5) + ' '}${fm(c.to.start)}–${fm(c.to.end)}` : ''}: ${c.kind}. ${c.reason}`;
