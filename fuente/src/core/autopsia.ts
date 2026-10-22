// Autopsia de un examen: registro de cómo fue y resumen BASADO EN REGLAS (no es un algoritmo estadístico ni aprende).
// Con pocos exámenes no hay conclusiones fiables; por eso los ajustes se proponen y el usuario los confirma.
import type { Phase } from './fases.ts';

export const CAUSES: [string, string][] = [
  ['concepto', 'No entendía el concepto'], ['olvido', 'Lo sabía pero no me salió'], ['calculo', 'Error de cálculo o descuido'],
  ['tiempo', 'Me faltó tiempo'], ['nervios', 'Nervios o bloqueo'], ['noestudiado', 'No lo había estudiado'], ['enunciado', 'Leí mal el enunciado'],
];
export const HELPED: [string, string][] = [['comprender', 'Comprender'], ['problemas', 'Hacer problemas'], ['simulacros', 'Simulacros'], ['repasar', 'Repasar'], ['memorizar', 'Memorizar']];
export interface Autopsy {
  id: string; workId: string; subjectId: string; date: string; expected: number | null;
  time?: 'sobro' | 'justo' | 'falto'; causes: string[]; weakTopics: string[]; helped?: string;
  guion?: boolean; comments?: number; createdAt: number;
}
export interface GradeLite { workId?: string; score: number }

/** Valida y normaliza el formulario. `expected` opcional (0–10). */
export function makeAutopsy(v: Partial<Autopsy> & { workId: string; subjectId: string }, date: string, id: string, at: number): { a?: Autopsy; err?: string } {
  const e = v.expected == null || (v.expected as unknown) === '' ? null : +v.expected;
  if (e != null && !(e >= 0 && e <= 10)) return { err: 'La nota esperada va de 0 a 10.' };
  const c = v.comments == null || (v.comments as unknown) === '' ? undefined : +v.comments;
  if (c != null && !(Number.isInteger(c) && c >= 0 && c <= 50)) return { err: 'El número de comentarios debe ser un entero entre 0 y 50.' };
  const ok = new Set(CAUSES.map(x => x[0]));
  return { a: { id, workId: v.workId, subjectId: v.subjectId, date, expected: e, time: v.time, causes: [...new Set((v.causes ?? []).filter(x => ok.has(x)))], weakTopics: [...new Set(v.weakTopics ?? [])].slice(0, 30), helped: v.helped || undefined, guion: v.guion, comments: c, createdAt: at } };
}
/** Una autopsia por examen: guardar otra vez la sustituye (idempotente). */
export const saveAutopsy = (list: Autopsy[], a: Autopsy): Autopsy[] => [...list.filter(x => x.workId !== a.workId), a];

export function causeFreq(list: Autopsy[], subjectId?: string): { id: string; label: string; n: number; pct: number }[] {
  const l = subjectId ? list.filter(a => a.subjectId === subjectId) : list;
  return CAUSES.map(([id, label]) => { const n = l.filter(a => a.causes.includes(id)).length; return { id, label, n, pct: l.length ? Math.round(100 * n / l.length) : 0 }; })
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}

/** Nota esperada frente a real, por examen con ambas. diff>0: esperabas más de lo que sacaste. */
export function calibration(list: Autopsy[], grades: GradeLite[]): { n: number; mean: number | null; rows: { workId: string; expected: number; real: number; diff: number }[] } {
  const rows = list.flatMap(a => { const g = grades.find(x => x.workId === a.workId); return a.expected != null && g ? [{ workId: a.workId, expected: a.expected, real: g.score, diff: Math.round((a.expected - g.score) * 100) / 100 }] : []; });
  return { n: rows.length, mean: rows.length ? Math.round(100 * rows.reduce((s, r) => s + r.diff, 0) / rows.length) / 100 : null, rows };
}

/** Confianza previa (1–5) frente a nota real: ¿te fías de la sensación de «no voy preparado»? Mínimo 3 exámenes con ambas. */
export function confidenceInsight(works: { id: string; confidence?: number }[], grades: GradeLite[]): { n: number; low?: number; high?: number; lowN: number; highN: number; verdict: 'sin-datos' | 'poco-fiable' | 'fiable' | 'neutro' } {
  const rows = works.flatMap(w => { const g = grades.find(x => x.workId === w.id); return w.confidence && g ? [{ c: w.confidence, s: g.score }] : []; });
  const lo = rows.filter(r => r.c <= 2), hi = rows.filter(r => r.c >= 4), m = (a: typeof rows) => a.length ? Math.round(10 * a.reduce((s, r) => s + r.s, 0) / a.length) / 10 : undefined;
  const base = { n: rows.length, low: m(lo), high: m(hi), lowN: lo.length, highN: hi.length };
  if (rows.length < 3 || !lo.length) return { ...base, verdict: 'sin-datos' };
  const aprobado = lo.filter(r => r.s >= 5).length / lo.length;
  return { ...base, verdict: base.low! >= 6.5 || aprobado === 1 && base.low! >= 5.5 ? 'poco-fiable' : hi.length && base.high! - base.low! > 1 ? 'fiable' : 'neutro' };
}

/** Mueve `amount` puntos hacia las fases `to`, quitándolos a la mayor de las demás (sin bajar de 5). Devuelve null si no cambia nada. */
export function shift(pcts: number[], to: number[], amount: number): number[] | null {
  const out = [...pcts]; let left = amount * to.length, moved = 0;
  const others = () => out.map((v, i) => [v, i] as const).filter(([, i]) => !to.includes(i)).sort((a, b) => b[0] - a[0]);
  while (left > 0) { const d = others()[0]; if (!d || d[0] <= 5) break; const t = Math.min(left, d[0] - 5, 5); out[d[1]] -= t; left -= t; moved += t; }
  if (!moved) return null;
  const each = moved / to.length; to.forEach(i => { out[i] += each; });
  return out.map(x => Math.round(x * 10) / 10);
}
const RULES: Record<string, { text: string; ids: string[]; amount: number }> = {
  concepto: { text: 'Te falló entender los conceptos: más peso a la primera fase (+10 %).', ids: ['first'], amount: 10 },
  olvido: { text: 'Lo sabías pero no salió: más peso a memorizar y a la prueba en frío (+10 %).', ids: ['memorizar', 'frio'], amount: 5 },
  tiempo: { text: 'Te faltó tiempo: más peso a la última fase, con cronómetro (+10 %).', ids: ['last'], amount: 10 },
  calculo: { text: 'Errores de cálculo o descuidos: más peso a la última fase de práctica (+10 %).', ids: ['last'], amount: 10 },
};
/** Propuestas de ajuste del reparto de una asignatura. Regla: la causa aparece en ≥ 2 autopsias de la asignatura y en ≥ 50 % de ellas. */
export function suggestions(list: Autopsy[], subjectId: string, phases: Phase[]): { cause: string; text: string; pcts: number[] }[] {
  const l = list.filter(a => a.subjectId === subjectId); if (l.length < 2 || phases.length < 2) return [];
  const pcts = phases.map(p => p.pct), out: { cause: string; text: string; pcts: number[] }[] = [];
  for (const f of causeFreq(l)) {
    const r = RULES[f.id]; if (!r || f.n < 2 || f.pct < 50) continue;
    const idx = [...new Set(r.ids.flatMap(k => k === 'first' ? [0] : k === 'last' ? [phases.length - 1] : phases.some(p => p.id === k) ? [phases.findIndex(p => p.id === k)] : []))];
    const to = idx.length ? idx : [phases.length - 1], np = shift(pcts, to, r.amount);
    if (np) out.push({ cause: f.id, text: r.text, pcts: np });
  }
  return out;
}
