/** Resumen de la semana (domingo: la semana en curso; lunes: la que acaba de terminar). Usa la misma fórmula de cumplimiento que las estadísticas:
 *  min programados de sesiones hechas / min programados de sesiones hechas + omitidas. Sin datos suficientes no se inventa nada. */
import type { Block, Work } from './types.ts';
import { stats } from './stats.ts';
import type { Fallo } from './errores.ts';
import { addDays, weekday } from './planner.ts';
const mondayOf = (d: string) => addDays(d, -((weekday(d) + 6) % 7));
export interface Resumen { from: string; to: string; plannedMin: number; completedMin: number; compliance: number | null; subjects: { id: string; plannedMin: number; completedMin: number; compliance: number | null }[]; weakest: string | null; fallosNuevos: number; fallosDominados: number }
export const WEAK_BELOW = 80, MIN_SUBJECT_MIN = 60;
export function weekToReview(today: string): string | null { const w = weekday(today); return w === 0 ? mondayOf(today) : w === 1 ? addDays(mondayOf(today), -7) : null; }
export function resumenSemana(a: { blocks: Block[]; works: Work[]; fallos: Fallo[]; today: string }): Resumen | null {
  const from = weekToReview(a.today); if (!from) return null; const to = addDays(from, 6);
  const wb = a.blocks.filter(b => b.date >= from && b.date <= to && b.date <= a.today), sidOf = new Map(a.works.map(w => [w.id, w.subjectId]));
  const t = stats(wb, a.works, { date: a.today, minute: 0 }); if (t.plannedMin === 0) return null;
  const ids = [...new Set(wb.map(b => sidOf.get(b.workId)).filter(Boolean) as string[])].sort();
  const subjects = ids.map(id => { const s = stats(wb.filter(b => sidOf.get(b.workId) === id), a.works, { date: a.today, minute: 0 }); return { id, plannedMin: s.plannedMin, completedMin: s.completedMin, compliance: s.compliance }; });
  const weak = subjects.filter(s => s.compliance !== null && s.compliance < WEAK_BELOW && s.plannedMin >= MIN_SUBJECT_MIN).sort((x, y) => x.compliance! - y.compliance! || y.plannedMin - x.plannedMin || x.id.localeCompare(y.id))[0];
  return { from, to, plannedMin: t.plannedMin, completedMin: t.completedMin, compliance: t.compliance, subjects, weakest: weak?.id ?? null,
    fallosNuevos: a.fallos.filter(f => f.created >= from && f.created <= to).length, fallosDominados: a.fallos.filter(f => f.masteredAt && f.masteredAt >= from && f.masteredAt <= to).length };
}
