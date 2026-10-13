import { addDays, daysBetween, hourBucket, weekday } from './planner.ts';
import type { Block, Work } from './types.ts';

/** Objetivos, notas, proyección de nota, temario con repaso espaciado, ritmo aprendido, curso hasta la PAU y revisión semanal.
 *  Todo son funciones PURAS y deterministas sobre datos persistidos. Los números marcados «heurístico» son aproximaciones, no mediciones. */
export type GradeKind = 'examen' | 'tarea' | 'evaluacion';
/** Nota de un examen o trabajo: `weight` = % que vale dentro de SU evaluación (1.ª, 2.ª o 3.ª; la 3.ª es la nota final de 2.º). Sin `weight` (datos antiguos) no entra en el cálculo. */
export interface Grade { id: string; subjectId: string; score: number; weight?: number; evalNo?: 1 | 2 | 3; kind?: GradeKind; date: string; label?: string; workId?: string }
export interface Goals { target: number | null; prevAvg?: number | null; prev?: Record<string, number>; subjTarget: Record<string, number>; pauDate: string | null; start: string | null; pauExpected: number | null; accessTarget: number | null }
export interface Topic2 { id: string; subjectId: string; name: string; course?: 1 | 2; mastery: 0 | 1 | 2 | 3; reviews: number; last: string | null; next: string | null; createdAt: number }
export const DEFAULT_GOALS: Goals = { target: null, prevAvg: null, subjTarget: {}, pauDate: null, start: null, pauExpected: null, accessTarget: null };

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const r2 = (x: number) => Math.round(x * 100) / 100;
const dur = (b: { start: number; end: number }) => b.end - b.start;
const mins = (b: Block) => b.actualMin ?? dur(b);

// ---------- Notas por evaluación y porcentaje ----------
/** Evaluación por fecha (aproximada, editable al guardar la nota): sept–dic 1.ª, ene–mar 2.ª, abr–ago 3.ª. */
export const evalOfDate = (d: string): 1 | 2 | 3 => { const m = +d.slice(5, 7); return m >= 9 ? 1 : m <= 3 ? 2 : 3; };
export const gradeEval = (g: Grade): 1 | 2 | 3 => g.evalNo ?? evalOfDate(g.date);
const usable = (g: Grade) => Number.isFinite(g.score) && typeof g.weight === 'number' && g.weight > 0;
export const subjectTarget = (g: Goals | undefined, sid: string): number | null => g?.subjTarget?.[sid] ?? g?.target ?? null;
export type EvalStatus = 'sin notas' | 'cumplido' | 'posible' | 'imposible' | 'completa';
/** Resumen de UNA evaluación de UNA asignatura. Ganado = Σ nota·% / 100 (puntos sobre 10). Lleva = ganado / % evaluado. Necesitas en lo que queda = (objetivo − ganado)·100 / % restante. */
export function evalSummary(grades: Grade[], sid: string, evalNo: 1 | 2 | 3, target: number | null) {
  const gs = grades.filter(x => x.subjectId === sid && gradeEval(x) === evalNo && usable(x));
  const doneW = r2(gs.reduce((a, x) => a + x.weight!, 0)), earned = r2(gs.reduce((a, x) => a + x.score * x.weight!, 0) / 100);
  const remW = r2(Math.max(0, 100 - doneW)), cur = doneW > 0 ? r2(earned * 100 / doneW) : null;
  const need = target != null && remW > 0 && earned < target ? r2((target - earned) * 100 / remW) : null;
  const max = r2(earned + 10 * remW / 100);
  const status: EvalStatus = !gs.length ? 'sin notas' : target != null && earned >= target ? 'cumplido' : remW === 0 ? 'completa' : need != null && need > 10 ? 'imposible' : 'posible';
  return { n: gs.length, doneW, earned, cur, remW, need, max, over: doneW > 100.0001, status };
}
/** Nota que se usa para proyectar a una asignatura: la media (lo que «llevas») de la evaluación en curso; si aún no hay notas, la de la última evaluación anterior con datos. */
export function projected(g: Goals | undefined, grades: Grade[], sid: string, today: string): { value: number | null; n: number; evalNo: 1 | 2 | 3 | null } {
  const act = evalOfDate(today);
  for (const e of [act, ...[3, 2, 1].filter(x => x < act), ...[3, 2, 1].filter(x => x > act)] as (1 | 2 | 3)[]) { const r = evalSummary(grades, sid, e, null); if (r.cur != null) return { value: r.cur, n: r.n, evalNo: e }; }
  return { value: null, n: 0, evalNo: null };
}
/** Puntos que faltan para el objetivo (positivo = por debajo). null si no hay objetivo o no hay notas. */
export function gapOf(g: Goals | undefined, grades: Grade[], sid: string, today: string): number | null {
  const t = subjectTarget(g, sid), p = projected(g, grades, sid, today).value;
  return t == null || p == null ? null : r2(t - p);
}
/** Factor de horas de EXAMEN según la brecha: +10 % por punto por debajo del objetivo (máx. +30 %), −10 % como mucho si vas holgado. Heurístico. */
export const boostFactor = (gap: number | null) => gap == null ? 1 : r2(clamp(1 + 0.1 * gap, 0.9, 1.3));
export function boosts(g: Goals | undefined, grades: Grade[], subjects: { id: string; archived?: boolean }[], today: string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const s of subjects) if (!s.archived) { const f = boostFactor(gapOf(g, grades, s.id, today)); if (f !== 1) o[s.id] = f; }
  return o;
}
/** Media estimada de 2.º = media de lo que «llevas» en cada asignatura con notas. */
export function overall(g: Goals | undefined, grades: Grade[], subjects: { id: string; name: string; archived?: boolean }[], today: string) {
  const rows = subjects.filter(s => !s.archived).map(s => ({ id: s.id, name: s.name, ...projected(g, grades, s.id, today), target: subjectTarget(g, s.id), gap: gapOf(g, grades, s.id, today) }));
  const vals = rows.filter(r => r.value != null);
  const media = vals.length ? r2(vals.reduce((a, r) => a + r.value!, 0) / vals.length) : null;
  const tv = rows.filter(r => r.target != null);
  const target = tv.length ? r2(tv.reduce((a, r) => a + r.target!, 0) / tv.length) : null;
  const worst = rows.filter(r => r.gap != null && r.gap > 0).sort((a, b) => b.gap! - a.gap! || a.name.localeCompare(b.name))[0] ?? null;
  return { rows, media, target, gap: media != null && target != null ? r2(target - media) : null, worst, covered: vals.length, total: rows.length };
}
/** Nota de acceso de fase general = 0,6·nota media de bachillerato + 0,4·PAU (sobre 10). La media de bachillerato = media de 1.º y de 2.º. No modela ponderaciones ni fase voluntaria. */
export function accessInfo(g: Goals | undefined, media2: number | null) {
  const pau = g?.pauExpected ?? null, acc = g?.accessTarget ?? null, p1 = g?.prevAvg ?? null;
  const nmb = media2 != null ? (p1 != null ? r2((p1 + media2) / 2) : media2) : null;
  const access = nmb != null && pau != null ? r2(0.6 * nmb + 0.4 * pau) : null;
  const nmbNeed = acc != null && pau != null ? (acc - 0.4 * pau) / 0.6 : null;
  const needMedia = nmbNeed == null ? null : r2(p1 != null ? 2 * nmbNeed - p1 : nmbNeed);
  return { nmb, access, needMedia, feasible: needMedia == null ? null : needMedia <= 10 };
}

// ---------- Temario y repaso espaciado ----------
export const INTERVALS = [2, 7, 21, 45, 90];
export const LEVELS = ['Sin ver', 'Visto', 'Entendido', 'Dominado'];
export function newTopic(id: string, subjectId: string, name: string, mastery: number, today: string, createdAt = 0, course: 1 | 2 = 2, stagger = 0): Topic2 {
  const t = setMastery({ id, subjectId, name, course, mastery: 0, reviews: 0, last: null, next: null, createdAt }, mastery, today);
  return t.next && stagger > 0 ? { ...t, next: addDays(t.next, stagger) } : t; // altas en bloque: primeros repasos escalonados para no crear una avalancha
}
export function setMastery(t: Topic2, level: number, today: string): Topic2 {
  const L = clamp(Math.round(level), 0, 3) as 0 | 1 | 2 | 3;
  if (L === 0) return { ...t, mastery: 0, reviews: 0, last: null, next: null };
  const first = t.mastery === 0;
  return { ...t, mastery: L, reviews: first ? 0 : t.reviews, last: first ? today : t.last, next: t.next ?? addDays(today, INTERVALS[Math.min(first ? 0 : t.reviews, INTERVALS.length - 1)]) };
}
/** Resultado de un repaso: bien → sube un nivel y espacia más; regular → repetir en 3 días; mal → baja y repetir mañana. */
export function reviewDone(t: Topic2, rating: 'bien' | 'regular' | 'mal', today: string): Topic2 {
  if (rating === 'bien') { const n = t.reviews + 1; return { ...t, reviews: n, mastery: Math.min(3, Math.max(1, t.mastery + 1)) as 1 | 2 | 3, last: today, next: addDays(today, INTERVALS[Math.min(n, INTERVALS.length - 1)]) }; }
  if (rating === 'regular') return { ...t, last: today, next: addDays(today, 3) };
  return { ...t, reviews: Math.max(0, t.reviews - 1), mastery: Math.max(1, t.mastery - 1) as 1 | 2 | 3, last: today, next: addDays(today, 1) };
}
export const REVIEW_MIN = 25, REVIEW_LOOKAHEAD = 2, REVIEW_WINDOW = 3, REVIEW_MAX_ACTIVE = 8;
/** Sincroniza las tareas automáticas de repaso con el temario. Idempotente: mismo estado → mismo resultado. Nunca borra trabajo con sesiones hechas (lo archiva). */
export function syncReviews(works: Work[], blocks: Block[], topics: Topic2[], subjects: { id: string; archived?: boolean }[], today: string, gap: (sid: string) => number | null, ms = 0): { works: Work[]; added: string[]; removed: string[] } {
  const live = new Set(subjects.filter(s => !s.archived).map(s => s.id));
  const due = topics.filter(t => t.mastery >= 1 && t.next && t.next <= addDays(today, REVIEW_LOOKAHEAD) && live.has(t.subjectId))
    .sort((a, b) => (gap(b.subjectId) ?? 0) - (gap(a.subjectId) ?? 0) || a.next!.localeCompare(b.next!) || a.id.localeCompare(b.id)).slice(0, REVIEW_MAX_ACTIVE);
  const want = new Map(due.map(t => [`rev:${t.id}:${t.reviews}`, t]));
  const have = new Set(works.map(w => w.id)), added: string[] = [], removed: string[] = [];
  const act = (w: Work) => w.status === 'pending' || w.status === 'in_progress';
  let out: Work[] = [];
  for (const w of works) {
    if (w.auto !== 'review' || !act(w) || want.has(w.id)) { out.push(w); continue; }
    removed.push(w.id);
    if (blocks.some(b => b.workId === w.id && b.status === 'done')) out.push({ ...w, status: 'archived' });
  }
  for (const [id, t] of want) {
    if (have.has(id)) continue;
    const m = t.mastery >= 3 ? 20 : REVIEW_MIN;
    out.push({ id, kind: 'task', subjectId: t.subjectId, title: 'Repaso: ' + t.name, dueDate: addDays(t.next! > today ? t.next! : today, REVIEW_WINDOW), estMin: m, manualEstMin: m, autoEst: false, difficulty: 2, importance: 3, readiness: 0, status: 'pending', auto: 'review', topicRef: t.id, createdAt: ms } as Work);
    added.push(id);
  }
  return { works: out, added, removed };
}
export function coverageByCourse(topics: Topic2[]) {
  return ([1, 2] as const).map(c => { const ts = topics.filter(t => (t.course ?? 2) === c), n = ts.length, seen = ts.filter(t => t.mastery >= 1).length; return { course: c, n, seen, pctSeen: n ? Math.round(100 * seen / n) : null, pctMastery: n ? Math.round(100 * ts.reduce((a, t) => a + t.mastery, 0) / (3 * n)) : null }; });
}
export function coverage(topics: Topic2[], sid: string) {
  const ts = topics.filter(t => t.subjectId === sid), n = ts.length, seen = ts.filter(t => t.mastery >= 1).length, sum = ts.reduce((a, t) => a + t.mastery, 0);
  return { n, seen, pctSeen: n ? Math.round(100 * seen / n) : null, pctMastery: n ? Math.round(100 * sum / (3 * n)) : null, due: ts.filter(t => t.mastery >= 1 && t.next && t.next <= addDays('9999-12-31', 0)).length };
}
/** El PAU examina TODO el temario acumulado (1.º y 2.º): cada tema visto exige mantenimiento hasta la PAU. Minutos/semana de repaso según el intervalo actual de cada tema. */
export const MAINT_STEADY_DAYS = INTERVALS[INTERVALS.length - 1];
export function maintenance(topics: Topic2[]): { nowWeekMin: number; steadyWeekMin: number } {
  let now = 0; for (const t of topics) if (t.mastery >= 1) now += 7 * REVIEW_MIN / INTERVALS[Math.min(t.reviews, INTERVALS.length - 1)];
  return { nowWeekMin: Math.round(now), steadyWeekMin: Math.round(topics.length * 7 * REVIEW_MIN / MAINT_STEADY_DAYS) };
}
/** Minutos que faltan por tema según su nivel (heurístico): sin ver 120, visto 60, entendido 30, dominado 10 (mantenimiento). */
export const TOPIC_NEED = [120, 60, 30, 10];

// ---------- Ritmo aprendido (estimación vs. tiempo real) ----------
/** Guarda la estimación inicial (sin el ajuste aprendido) de cada trabajo con estimador v1 la primera vez que existe. */
export function stampBase(works: Work[], learned: Record<string, { factor: number; n: number }>): Work[] {
  return works.map(w => w.base0 == null && w.estimate && w.estimatorVersion !== 2 && w.auto !== 'review' && w.manualEstMin == null ? { ...w, base0: Math.max(5, Math.round(w.estimate.totalMin / (learned[w.subjectId]?.factor ?? 1))) } : w);
}
export function learnedPace(works: Work[], blocks: Block[]): Record<string, { factor: number; n: number }> {
  const bySub = new Map<string, number[]>();
  for (const w of works) {
    if (w.status !== 'done' || !(w.base0 && w.base0 > 0) || w.auto === 'review') continue;
    const inv = blocks.filter(b => b.workId === w.id && b.status === 'done').reduce((a, b) => a + mins(b), 0);
    if (inv < 10) continue;
    const fx = w.felt === 1 ? 1.25 : w.felt === -1 ? 0.8 : 1; // «¿tardaste más o menos de lo previsto?»
    (bySub.get(w.subjectId) ?? bySub.set(w.subjectId, []).get(w.subjectId)!).push(clamp(inv * fx / w.base0, 0.4, 2.5));
  }
  const out: Record<string, { factor: number; n: number }> = {};
  for (const [sid, rs0] of bySub) {
    const rs = rs0.slice(-8), n = rs.length; if (n < 3) continue;
    const s = [...rs].sort((a, b) => a - b), med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    out[sid] = { factor: r2(clamp(1 + (med - 1) * n / (n + 3), 0.7, 1.6)), n };
  }
  return out;
}

// ---------- Calidad de sesión ----------
export const QUALITY = [['3', 'Bien'], ['2', 'Regular'], ['1', 'Mal']];
/** Franja horaria con mejor calidad media (≥3 sesiones valoradas en la franja y ≥8 en total). */
export function bestHours(blocks: Block[]): { label: string; avg: number; n: number } | null {
  const q = blocks.filter(b => b.status === 'done' && (b as any).quality >= 1);
  if (q.length < 8) return null;
  const bk = (m: number) => m < 15 * 60 ? 'antes de las 15:00' : m < 18 * 60 ? '15:00–18:00' : m < 21 * 60 ? '18:00–21:00' : 'después de las 21:00';
  const g = new Map<string, number[]>();
  for (const b of q) { const k = bk(b.start); (g.get(k) ?? g.set(k, []).get(k)!).push((b as any).quality); }
  const rows = [...g].filter(([, v]) => v.length >= 3).map(([label, v]) => ({ label, avg: r2(v.reduce((a, x) => a + x, 0) / v.length), n: v.length })).sort((a, b) => b.avg - a.avg || b.n - a.n);
  return rows.length >= 2 && rows[0].avg - rows[rows.length - 1].avg >= 0.3 ? rows[0] : null;
}

// ---------- Curso hasta la PAU ----------
export function macro(a: { goals: Goals; topics: Topic2[]; settings: { availability: Record<number, { start: number; end: number }[]>; maxDayMin: number }; today: string }) {
  const g = a.goals; if (!g.pauDate) return null;
  const days = daysBetween(a.today, g.pauDate);
  if (days < 0) return { past: true as const };
  const dayCap = (d: number) => Math.min(a.settings.maxDayMin, (a.settings.availability[d] ?? []).reduce((s, w) => s + dur(w), 0));
  const weekCap = [0, 1, 2, 3, 4, 5, 6].reduce((s, d) => s + dayCap(d), 0);
  const covEnd = addDays(g.pauDate, -43), pracEnd = addDays(g.pauDate, -15);
  const phases = [{ id: 'cobertura', label: 'Cobertura del temario', from: g.start ?? a.today, to: covEnd }, { id: 'practica', label: 'Práctica y errores', from: addDays(covEnd, 1), to: pracEnd }, { id: 'simulacros', label: 'Simulacros y repaso final', from: addDays(pracEnd, 1), to: g.pauDate }];
  const phase = a.today <= covEnd ? phases[0] : a.today <= pracEnd ? phases[1] : phases[2];
  const need = a.topics.reduce((s, t) => s + TOPIC_NEED[t.mastery], 0);
  const left = Math.max(0, daysBetween(a.today, covEnd)), REAL = 0.7; // se asume que solo el 70 % de la capacidad teórica se cumple
  const mt = maintenance(a.topics), backlog = a.topics.filter(t => t.mastery >= 1 && t.next && t.next < a.today).length;
  const netWeek = Math.max(0, weekCap * REAL - mt.nowWeekMin); // lo que sobra para temario nuevo una vez pagado el mantenimiento
  const capCov = Math.round(netWeek * left / 7), capAll = Math.round(weekCap * REAL * days / 7);
  const ratio = need === 0 ? null : capCov / need;
  const seen = a.topics.length ? a.topics.filter(t => t.mastery >= 1).length / a.topics.length : null;
  const total = g.start && covEnd > g.start ? daysBetween(g.start, covEnd) : 0;
  const expected = total > 0 ? clamp(daysBetween(g.start!, a.today) / total, 0, 1) : null;
  const status = a.topics.length === 0 ? 'sin temario' : need === 0 ? 'bien' : left === 0 ? (need > 0 ? 'no llegas' : 'bien') : ratio! >= 1.3 ? 'bien' : ratio! >= 1 ? 'justo' : 'no llegas';
  return { past: false as const, days, weeks: Math.round(days / 7), weekCap, phase, phases, needMin: need, capCoverageMin: capCov, capTotalMin: capAll, maintNowWeekMin: mt.nowWeekMin, maintSteadyWeekMin: mt.steadyWeekMin, backlog, status, seenPct: seen == null ? null : Math.round(100 * seen), expectedPct: expected == null ? null : Math.round(100 * expected) };
}

// ---------- Aprender de tu cumplimiento (franjas, días, máximo diario, dominio del temario) ----------
export const HOUR_LABELS = ['antes de las 13:00', '13:00–17:00', '17:00–20:00', 'desde las 20:00'];
export const DOW_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
/** Sesiones ya cerradas (antes de hoy): hechas frente a omitidas o reprogramadas. Un «imprevisto» no es culpa de la franja y no cuenta. */
const closedOf = (blocks: Block[], today: string) => blocks.filter(b => b.date < today && (b.status === 'done' || b.status === 'skipped' || b.status === 'rescheduled') && (b as any).reason !== 'imprevisto');
export interface SlotStats { total: number; rate: number | null; hours: { n: number; miss: number }[]; days: { n: number; miss: number }[]; avoidHours: number[]; avoidDays: number[] }
export const SLOT_MIN_TOTAL = 12, SLOT_MIN_N = 4;
export function slotStats(blocks: Block[], today: string): SlotStats {
  const c = closedOf(blocks, today), hours = [0, 1, 2, 3].map(() => ({ n: 0, miss: 0 })), days = [0, 1, 2, 3, 4, 5, 6].map(() => ({ n: 0, miss: 0 }));
  for (const b of c) { const m = b.status === 'done' ? 0 : 1, h = hours[hourBucket(b.start)], d = days[weekday(b.date)]; h.n++; h.miss += m; d.n++; d.miss += m; }
  const total = c.length, rate = total ? c.filter(b => b.status !== 'done').length / total : null;
  const bad = (x: { n: number; miss: number }) => rate != null && total >= SLOT_MIN_TOTAL && x.n >= SLOT_MIN_N && x.miss / x.n >= 0.5 && x.miss / x.n >= rate + 0.25;
  let avoidHours = hours.map((x, i) => bad(x) ? i : -1).filter(i => i >= 0), avoidDays = days.map((x, i) => bad(x) ? i : -1).filter(i => i >= 0);
  if (avoidHours.length >= 4) avoidHours = []; // si todo es «malo» no hay a dónde huir
  if (avoidDays.length >= 7) avoidDays = [];
  return { total, rate, hours, days, avoidHours, avoidDays };
}
/** Sugerencia de máximo diario según los últimos 14 días: sube si cumples casi todo y lo planificado llega al tope; baja si fallas mucho. */
export function suggestCap(blocks: Block[], today: string, maxDayMin: number): { cap: number; reason: string } | null {
  const from = addDays(today, -14), c = closedOf(blocks, today).filter(b => b.date >= from);
  if (c.length < 6) return null;
  const done = c.filter(b => b.status === 'done').length, rate = done / c.length;
  const byDay = new Map<string, number>(); for (const b of blocks) if (b.date >= from && b.date < today && b.status !== 'rescheduled') byDay.set(b.date, (byDay.get(b.date) ?? 0) + (b.end - b.start));
  const topFull = [...byDay.values()].filter(v => v >= maxDayMin - 30).length;
  const pc = Math.round(rate * 100);
  if (rate >= 0.9 && topFull >= 3 && maxDayMin < 360) return { cap: maxDayMin + 30, reason: `Has hecho el ${pc} % de tus sesiones de las últimas 2 semanas y en ${topFull} días llegaste al tope. Podrías subir el máximo diario.` };
  if (rate < 0.6 && maxDayMin > 120) return { cap: Math.max(120, maxDayMin - 30), reason: `Has hecho el ${pc} % de tus sesiones de las últimas 2 semanas. Un tope más bajo hará el plan más realista.` };
  return null;
}
/** El dominio medio del temario de una asignatura ajusta sus horas de examen: poco dominio → más horas, mucho → menos. Necesita ≥3 temas. */
export function masteryFactor(topics: Topic2[], sid: string): number | null {
  const t = topics.filter(x => x.subjectId === sid); if (t.length < 3) return null;
  const avg = t.reduce((a, x) => a + x.mastery, 0) / t.length; // 0..3
  return r2(clamp(1.2 - 0.1 * avg, 0.9, 1.2));
}
/** Combina la brecha con el objetivo y el dominio del temario en un factor por asignatura (solo exámenes). */
export function examBoosts(g: Goals | undefined, grades: Grade[], topics: Topic2[], subjects: { id: string; archived?: boolean }[], today: string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const s of subjects) if (!s.archived) { const a = boostFactor(gapOf(g, grades, s.id, today)), m = masteryFactor(topics, s.id) ?? 1, f = r2(clamp(a * m, 0.85, 1.4)); if (f !== 1) o[s.id] = f; }
  return o;
}
