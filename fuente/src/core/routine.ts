/** Rutina semanal habitual. AMPLÍA el planificador existente (plan/capacityFor); no es otro motor.
 *  Tres tipos separados: obligaciones (works+blocks, prioridad), bloques de rutina (esto: sugeridos) y actividades opcionales. Determinista. */
import type { Activity, Block, HabitBlock, Now, Routine, Settings, Win, Work } from './types.ts';
import { addDays, weekday, subtract, plan } from './planner.ts';
import { METHOD, methodOf } from './method.ts';

export const DEFAULT_ROUTINE: Routine = { enabled: false, intensity: 'equilibrado', blockMin: 45, perWeek: {}, activeDays: [1, 2, 3, 4, 5, 6, 0], fixed: [], lastTopic: {}, quiet: [], generatedThrough: null };
export const INTENSITY = { ligero: { daily: 1, perWeek: 1, review: false }, equilibrado: { daily: 2, perWeek: 2, review: true }, exigente: { daily: 3, perWeek: 3, review: true } } as const;
export const HORIZON_DAYS = 14, REVIEW_MIN = 20, ABSORB = 25, SHORT_MIN = 30;
export interface Subj { id: string; name: string; archived?: boolean; colorKey?: string; family?: string }
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
  const quota = (sid: string) => Math.max(0, R.perWeek[sid] ?? I.perWeek), subjOf = new Map(i.works.map(w => [w.id, w.subjectId]));
  // Las obligaciones de la semana cuentan como sesiones de esa asignatura: la rutina solo rellena lo que falta (no añade una clase de Lengua si ya hay deberes de Lengua).
  const oblig = (sid: string, mon: string) => i.blocks.filter(b => (b.status === 'planned' || b.status === 'done') && subjOf.get(b.workId) === sid && mondayOf(b.date) === mon).length;
  for (let d = i.from; d <= i.to; d = addDays(d, 1)) {
    if (d < i.now.date || !R.activeDays.includes(weekday(d))) continue;
    const mon = mondayOf(d), have = (sid: string) => all.filter(h => h.subjectId === sid && h.kind === 'estudio' && h.status !== 'displaced' && mondayOf(h.date) === mon).length + oblig(sid, mon);
    const today = all.filter(h => h.date === d && h.status !== 'displaced'), used = new Set(today.map(h => h.subjectId)), prev = new Set(all.filter(h => h.date === addDays(d, -1) && h.kind === 'estudio').map(h => h.subjectId));
    let cap = I.daily - today.filter(h => h.kind === 'estudio').length;
    // Días activos que quedan en la semana (hoy incluido): si una asignatura necesita tantos bloques como días quedan, HAY que ponerla hoy aunque ayer también toque (p. ej. 5 clases por semana).
    let dl = 0; for (let e = d; e <= addDays(mon, 6); e = addDays(e, 1)) if (e >= i.now.date && R.activeDays.includes(weekday(e))) dl++;
    // «Más antigua primero» cuenta también lo ya planificado (no solo lo hecho): así las asignaturas rotan en vez de ganar siempre las primeras de la lista.
    const seen = (sid: string) => all.reduce((m, h) => h.subjectId === sid && h.status !== 'displaced' && h.date < d && h.date > m ? h.date : m, last[sid] ?? '');
    const cand = subs.filter(s => quota(s.id) - have(s.id) > 0 && !used.has(s.id)).map(s => ({ s, k: [quota(s.id) - have(s.id) >= dl ? 0 : prev.has(s.id) ? 1 : 0, -quota(s.id), -(quota(s.id) - have(s.id)), seen(s.id), subs.indexOf(s)] as const }))
      .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2] || a.k[3].localeCompare(b.k[3]) || a.k[4] - b.k[4]);
    // Duración flexible para no dejar huecos: si tras colocar el bloque sobraría un trozo demasiado pequeño para otro bloque (≤ ABSORB min), el bloque lo absorbe (hasta +ABSORB);
    // si no cabe el bloque entero en ningún hueco, se admite uno más corto (≥ SHORT_MIN) antes que dejar el hueco vacío.
    const place = (s: Subj, want: number, kind: 'estudio' | 'repaso', flex = true) => {
      const fit = (m: number) => windows(c, d).find(x => x.end - up5(x.start) >= m);
      let w = fit(want), min = want; if (!w && flex) { min = kind === 'estudio' ? Math.max(SHORT_MIN, Math.min(want, i.settings.minSessionMin)) : 0; if (min && min < want) w = fit(min); }
      if (!w || !min) return false;
      const room = w.end - up5(w.start); if (flex && room - min <= ABSORB) min = Math.min(room, min + ABSORB);
      const st = up5(w.start), n = all.filter(h => h.subjectId === s.id && h.kind === 'estudio').length;
      const a = kind === 'estudio' ? activityFor(s, n, R.lastTopic[s.id]) : (() => { const m = methodOf(s.name, s.colorKey); return { title: `${s.name}: ${m.repaso.title}`, detail: `${m.repaso.detail} Por qué: recuperar de memoria y espaciar es la técnica mejor respaldada.` }; })();
      const h: HabitBlock = { id: `hab:${d}:${st}:${s.id}`, date: d, start: st, end: st + min, subjectId: s.id, kind, title: a.title, detail: a.detail, status: 'planned', pinned: false };
      all.push(h); out.push(h); used.add(s.id); return true;
    };
    for (const x of cand) { if (cap <= 0) break; if (!place(x.s, R.blockMin, 'estudio')) break; cap--; used.add(x.s.id); }
    if (I.review && !all.some(h => h.date === d && h.kind === 'repaso')) {
      const cnt = (sid: string) => all.filter(h => h.subjectId === sid && h.status !== 'displaced' && mondayOf(h.date) === mon).length + oblig(sid, mon);
      const r = subs.filter(s => !used.has(s.id) && quota(s.id) > 0).sort((a, b) => cnt(a.id) - cnt(b.id) || seen(a.id).localeCompare(seen(b.id)) || subs.indexOf(a) - subs.indexOf(b))[0];
      if (r && all.filter(h => h.date === d && h.status !== 'displaced').length < I.daily + 1) place(r, REVIEW_MIN, 'repaso');
    }
  }
  return out;
}

/** Propone el horario completo. Las OBLIGACIONES (tareas y exámenes) se planifican primero y nunca compiten con la rutina; la rutina es una sugerencia que se
 *  vuelve a generar cada vez con el tiempo que sobra (no se conservan bloques «sustituidos», «tachados» ni «sin hueco»). Se conservan: lo hecho, lo omitido, lo fijado y lo ya pasado.
 *  Determinista y estable: con los mismos datos da exactamente el mismo resultado, así que repetirlo no cambia nada. */
export function proposeSchedule(i: { settings: Settings; subjects: Subj[]; works: Work[]; blocks: Block[]; boost?: Record<string, number>; avoid?: { hours: number[]; days: number[] }; activities: Activity[]; routine: Routine; habit: HabitBlock[]; now: Now }) {
  const n = i.now, on = i.routine.enabled, to = addDays(n.date, HORIZON_DAYS - 1), fx = fixedBusy(i.routine, n.date, i.settings.horizonDays + 2);
  const keep = on ? i.habit.filter(h => h.date < n.date || (h.date === n.date && h.start < up5(n.minute)) || h.status === 'done' || h.status === 'skipped' || h.pinned) : i.habit;
  const pinned = keep.filter(h => h.date >= n.date);
  // La compactación del planificador puede liberar hueco para algo que quedó sin colocar: se repite hasta que el plan deja de cambiar (convergencia) y así repetir NUNCA cambia nada.
  const pl = (blocks: Block[]) => plan({ settings: i.settings, works: i.works, blocks, boost: i.boost, avoid: i.avoid, activities: [...i.activities, ...fx, ...habitBusy(pinned)] }, n), sig = (b: Block[]) => JSON.stringify(b.filter(x => x.status === 'planned').map(x => [x.id, x.start, x.end]).sort());
  let p = pl(i.blocks); for (let k = 0; k < 4; k++) { const q = pl(p.blocks); if (sig(q.blocks) === sig(p.blocks)) { p = q; break; } p = q; }
  if (!on) return { blocks: p.blocks, habit: i.habit, warnings: p.warnings, through: null as string | null };
  const gen = generate({ settings: i.settings, routine: i.routine, subjects: i.subjects, works: i.works, blocks: p.blocks, activities: i.activities, habit: keep, now: n, from: n.date, to });
  return { blocks: p.blocks, habit: [...keep, ...gen].sort(byDT), warnings: p.warnings, through: to as string | null };
}
/** Regenera la rutina futura: conserva hechos, fijados, omitidos y sustituidos; retira lo demás y vuelve a generar. */
export function regenerate(i: { settings: Settings; routine: Routine; subjects: Subj[]; works: Work[]; blocks: Block[]; activities: Activity[]; habit: HabitBlock[]; now: Now }) {
  const keep = i.habit.filter(h => h.date < i.now.date || h.status === 'done' || h.status === 'skipped' || h.status === 'replaced' || h.pinned);
  const to = addDays(i.now.date, HORIZON_DAYS - 1);
  return { habit: [...keep, ...generate({ ...i, habit: keep, from: i.now.date, to })].sort(byDT), through: to };
}
