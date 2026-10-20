/** Cuaderno de errores con repaso espaciado. Cada fallo vuelve a los 2 días, luego a la semana, a las 3 semanas y a las 5 (Cepeda 2008; Roediger y Karpicke 2006:
 *  recuperar de memoria lo que falló es lo que más consolida). Si vuelve a fallar, regresa al día siguiente y empieza de nuevo. Funciones puras e idempotentes. */
import { addDays } from './planner.ts';
export interface Fallo { id: string; subjectId: string; text: string; created: string; stage: number; next: string | null; last?: string; hits: number; misses: number; masteredAt?: string }
export const STAGES = [2, 7, 21, 35] as const, RETRY_DAYS = 1, MAX_TEXT = 140, MAX_DUE = 3;
const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
export function addFallo(list: Fallo[], f: { subjectId: string; text: string }, today: string, id: string): { list: Fallo[]; err?: string } {
  const text = f.text.trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT);
  if (!text) return { list, err: 'Escribe en una línea qué fallaste.' };
  if (!f.subjectId) return { list, err: 'Elige la asignatura.' };
  if (list.some(x => x.subjectId === f.subjectId && x.next !== null && norm(x.text) === norm(text))) return { list }; // repetir no duplica
  return { list: [...list, { id, subjectId: f.subjectId, text, created: today, stage: 0, next: addDays(today, STAGES[0]), hits: 0, misses: 0 }] };
}
/** Los que toca rehacer hoy (los más atrasados primero), como mucho MAX_DUE para no abrumar. */
export const dueFallos = (list: Fallo[], today: string, limit = MAX_DUE) => list.filter(f => f.next !== null && f.next <= today).sort((a, b) => a.next!.localeCompare(b.next!) || a.id.localeCompare(b.id)).slice(0, limit);
export function answerFallo(list: Fallo[], id: string, ok: boolean, today: string): Fallo[] {
  return list.map(f => {
    if (f.id !== id || f.next === null || f.last === today) return f; // ya respondido hoy: tocar dos veces no avanza dos etapas
    if (!ok) return { ...f, stage: 0, next: addDays(today, RETRY_DAYS), last: today, misses: f.misses + 1 };
    const stage = f.stage + 1;
    return stage >= STAGES.length ? { ...f, stage, next: null, last: today, hits: f.hits + 1, masteredAt: today } : { ...f, stage, next: addDays(today, STAGES[stage]), last: today, hits: f.hits + 1 };
  });
}
export const falloStats = (list: Fallo[], today: string) => ({ open: list.filter(f => f.next !== null).length, due: list.filter(f => f.next !== null && f.next <= today).length, mastered: list.filter(f => f.next === null).length });
