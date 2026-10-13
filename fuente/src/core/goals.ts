import { addDays, daysBetween } from './planner.ts';
import type { Block, Work } from './types.ts';

/** Objetivos, notas, proyección de nota, temario con repaso espaciado, ritmo aprendido, curso hasta la PAU y revisión semanal.
 *  Todo son funciones PURAS y deterministas sobre datos persistidos. Los números marcados «heurístico» son aproximaciones, no mediciones. */
export type GradeKind = 'examen' | 'tarea' | 'evaluacion';
export interface Grade { id: string; subjectId: string; score: number; kind: GradeKind; date: string; label?: string; workId?: string }
export interface Goals { target: number | null; prev: Record<string, number>; subjTarget: Record<string, number>; pauDate: string | null; start: string | null; pauExpected: number | null; accessTarget: number | null }
export interface Topic2 { id: string; subjectId: string; name: string; mastery: 0 | 1 | 2 | 3; reviews: number; last: string | null; next: string | null; createdAt: number }
export const DEFAULT_GOALS: Goals = { target: null, prev: {}, subjTarget: {}, pauDate: null, start: null, pauExpected: null, accessTarget: null };

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const r2 = (x: number) => Math.round(x * 100) / 100;
const dur = (b: { start: number; end: number }) => b.end - b.start;
const mins = (b: Block) => b.actualMin ?? dur(b);

// ---------- Notas y proyección ----------
/** Peso de cada tipo de nota en la media proyectada (heurístico, ajustable). Las más recientes pesan algo más (+15 % por posición). */
export const KIND_W: Record<GradeKind, number> = { examen: 2, tarea: 1, evaluacion: 3 };
/** La nota de 1º cuenta como si fueran PSEUDO_PREV puntos de peso: se diluye al entrar notas de 2º. */
export const PSEUDO_PREV = 2;
export type ProjSource = 'notas' | '1º' | 'mixta' | null;
export function projected(g: Goals | undefined, grades: Grade[], sid: string): { value: number | null; n: number; source: ProjSource } {
  const gs = grades.filter(x => x.subjectId === sid && Number.isFinite(x.score)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const prev = g?.prev?.[sid];
  const hasPrev = typeof prev === 'number' && Number.isFinite(prev);
  let W = 0, S = 0;
  gs.forEach((x, i) => { const w = KIND_W[x.kind] * (1 + 0.15 * i); W += w; S += w * x.score; });
  if (gs.length && hasPrev) return { value: r2((S + PSEUDO_PREV * prev!) / (W + PSEUDO_PREV)), n: gs.length, source: 'mixta' };
  if (gs.length) return { value: r2(S / W), n: gs.length, source: 'notas' };
  if (hasPrev) return { value: r2(prev!), n: 0, source: '1º' };
  return { value: null, n: 0, source: null };
}
export const subjectTarget = (g: Goals | undefined, sid: string): number | null => g?.subjTarget?.[sid] ?? g?.target ?? null;
/** Puntos que faltan para el objetivo (positivo = por debajo). null si no hay objetivo o no hay datos. */
export function gapOf(g: Goals | undefined, grades: Grade[], sid: string): number | null {
  const t = subjectTarget(g, sid), p = projected(g, grades, sid).value;
  return t == null || p == null ? null : r2(t - p);
}
/** Factor de horas de EXAMEN según la brecha: +10 % por punto por debajo del objetivo (máx. +30 %), −10 % como mucho si vas holgado. Heurístico. */
export const boostFactor = (gap: number | null) => gap == null ? 1 : r2(clamp(1 + 0.1 * gap, 0.9, 1.3));
export function boosts(g: Goals | undefined, grades: Grade[], subjects: { id: string; archived?: boolean }[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const s of subjects) if (!s.archived) { const f = boostFactor(gapOf(g, grades, s.id)); if (f !== 1) o[s.id] = f; }
  return o;
}
export function overall(g: Goals | undefined, grades: Grade[], subjects: { id: string; name: string; archived?: boolean }[]) {
  const rows = subjects.filter(s => !s.archived).map(s => ({ id: s.id, name: s.name, ...projected(g, grades, s.id), target: subjectTarget(g, s.id), gap: gapOf(g, grades, s.id) }));
  const vals = rows.filter(r => r.value != null);
  const media = vals.length ? r2(vals.reduce((a, r) => a + r.value!, 0) / vals.length) : null;
  const tv = rows.filter(r => r.value != null && r.target != null);
  const target = tv.length ? r2(tv.reduce((a, r) => a + r.target!, 0) / tv.length) : null;
  const worst = rows.filter(r => r.gap != null && r.gap > 0).sort((a, b) => b.gap! - a.gap! || a.name.localeCompare(b.name))[0] ?? null;
  return { rows, media, target, gap: media != null && target != null ? r2(target - media) : null, worst, covered: vals.length, total: rows.length };
}
/** Nota de acceso de fase general = 0,6·media de bachillerato + 0,4·PAU (sobre 10). No modela ponderaciones ni fase voluntaria. */
export function accessInfo(g: Goals | undefined, media: number | null) {
  const pau = g?.pauExpected ?? null, acc = g?.accessTarget ?? null;
  const access = media != null && pau != null ? r2(0.6 * media + 0.4 * pau) : null;
  const needMedia = acc != null && pau != null ? r2((acc - 0.4 * pau) / 0.6) : null;
  return { access, needMedia, feasible: needMedia == null ? null : needMedia <= 10 };
}
/** Tendencia: media de las 2 últimas notas menos la media de las anteriores (necesita ≥3 notas). */
export function trend(grades: Grade[], sid: string): number | null {
  const gs = grades.filter(x => x.subjectId === sid).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  if (gs.length < 3) return null;
  const last = gs.slice(-2), prev = gs.slice(0, -2), m = (a: Grade[]) => a.reduce((s, x) => s + x.score, 0) / a.length;
  return r2(m(last) - m(prev));
}

// ---------- Temario y repaso espaciado ----------
export const INTERVALS = [2, 7, 21, 45, 90];
export const LEVELS = ['Sin ver', 'Visto', 'Entendido', 'Dominado'];
export function newTopic(id: string, subjectId: string, name: string, mastery: number, today: string, createdAt = 0): Topic2 {
  return setMastery({ id, subjectId, name, mastery: 0, reviews: 0, last: null, next: null, createdAt }, mastery, today);
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
export function coverage(topics: Topic2[], sid: string) {
  const ts = topics.filter(t => t.subjectId === sid), n = ts.length, seen = ts.filter(t => t.mastery >= 1).length, sum = ts.reduce((a, t) => a + t.mastery, 0);
  return { n, seen, pctSeen: n ? Math.round(100 * seen / n) : null, pctMastery: n ? Math.round(100 * sum / (3 * n)) : null, due: ts.filter(t => t.mastery >= 1 && t.next && t.next <= addDays('9999-12-31', 0)).length };
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
    (bySub.get(w.subjectId) ?? bySub.set(w.subjectId, []).get(w.subjectId)!).push(clamp(inv / w.base0, 0.4, 2.5));
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
  const capCov = Math.round(weekCap * REAL * left / 7), capAll = Math.round(weekCap * REAL * days / 7);
  const ratio = need === 0 ? null : capCov / need;
  const seen = a.topics.length ? a.topics.filter(t => t.mastery >= 1).length / a.topics.length : null;
  const total = g.start && covEnd > g.start ? daysBetween(g.start, covEnd) : 0;
  const expected = total > 0 ? clamp(daysBetween(g.start!, a.today) / total, 0, 1) : null;
  const status = a.topics.length === 0 ? 'sin temario' : need === 0 ? 'bien' : left === 0 ? (need > 0 ? 'no llegas' : 'bien') : ratio! >= 1.3 ? 'bien' : ratio! >= 1 ? 'justo' : 'no llegas';
  return { past: false as const, days, weeks: Math.round(days / 7), weekCap, phase, phases, needMin: need, capCoverageMin: capCov, capTotalMin: capAll, status, seenPct: seen == null ? null : Math.round(100 * seen), expectedPct: expected == null ? null : Math.round(100 * expected) };
}

// ---------- Revisión semanal ----------
export interface RevLine { kind: 'ok' | 'warn' | 'tip'; text: string; action?: { a: 'maxDay'; v: number } }
export function weekReview(a: { blocks: Block[]; works: Work[]; subjects: { id: string; name: string; archived?: boolean }[]; grades: Grade[]; goals: Goals; settings: { maxDayMin: number }; today: string; reviewsDue?: number }) {
  const from = addDays(a.today, -7), to = addDays(a.today, -1);
  const bs = a.blocks.filter(b => b.date >= from && b.date <= to && b.status !== 'rescheduled');
  const sub = new Map(a.works.map(w => [w.id, w.subjectId]));
  let planned = 0, done = 0, dS = 0, sS = 0, skipped = 0; const by: Record<string, number> = {};
  for (const b of bs) { planned += dur(b); if (b.status === 'done') { const m = mins(b); done += m; dS += dur(b); const s = sub.get(b.workId) ?? '?'; by[s] = (by[s] ?? 0) + m; } else if (b.status === 'skipped') { sS += dur(b); skipped++; } }
  const compliance = dS + sS ? Math.round(100 * dS / (dS + sS)) : null;
  const lines: RevLine[] = [];
  if (planned === 0) lines.push({ kind: 'tip', text: 'La semana pasada no hubo sesiones planificadas: no hay datos para valorar.' });
  else if (compliance != null) {
    if (compliance < 60 && dS + sS >= 120) { const v = Math.max(60, Math.round(a.settings.maxDayMin * 0.85 / 15) * 15); lines.push({ kind: 'warn', text: `Cumpliste el ${compliance} % de lo resuelto. Un plan que no se cumple pierde valor: conviene bajar el máximo diario (de ${a.settings.maxDayMin} a ${v} min) y que el calendario llene menos.`, action: v < a.settings.maxDayMin ? { a: 'maxDay', v } : undefined }); }
    else if (compliance >= 90 && done >= 180) lines.push({ kind: 'ok', text: `Cumpliste el ${compliance} %: el plan es realista para ti. Si quieres más margen en una asignatura floja, es buen momento para subir su peso.` });
    else lines.push({ kind: 'tip', text: `Cumplimiento ${compliance} % (${dS} de ${dS + sS} min resueltos).` });
  }
  const ov = overall(a.goals, a.grades, a.subjects), wts = ov.rows.map(r => ({ r, w: Math.max(0.5, 1 + (r.gap ?? 0)) })), W = wts.reduce((s, x) => s + x.w, 0);
  if (done >= 120 && ov.covered > 0) for (const { r, w } of wts) {
    const exp = Math.round(100 * w / W), got = Math.round(100 * (by[r.id] ?? 0) / done);
    if (r.gap != null && r.gap > 0.5 && got + 10 <= exp) lines.push({ kind: 'warn', text: `${r.name}: ${got} % del tiempo frente a ~${exp} % que pide su brecha (te faltan ${String(r.gap).replace('.', ',')} puntos para tu objetivo).` });
  }
  const lastWeekGrades = a.grades.filter(g => g.date >= from && g.date <= to);
  if (lastWeekGrades.length) lines.push({ kind: 'tip', text: `Notas nuevas esta semana: ${lastWeekGrades.length}. Media proyectada actual: ${ov.media == null ? '—' : String(ov.media).replace('.', ',')}.` });
  const exams = a.works.filter(w => w.kind === 'exam' && w.dueDate >= from && w.dueDate <= to && !a.grades.some(g => g.workId === w.id));
  if (exams.length) lines.push({ kind: 'warn', text: `Falta la nota de: ${exams.map(w => w.title).join(', ')}. Sin ella la proyección no se actualiza.` });
  if (a.reviewsDue) lines.push({ kind: 'tip', text: `Tienes ${a.reviewsDue} repaso(s) del temario por hacer: son 20–25 min cada uno y evitan olvidar.` });
  const bh = bestHours(a.blocks); if (bh) lines.push({ kind: 'tip', text: `Tus sesiones salen mejor ${bh.label} (media ${String(bh.avg).replace('.', ',')} de 3).` });
  return { from, to, plannedMin: planned, doneMin: done, skipped, compliance, bySubject: by, lines };
}
