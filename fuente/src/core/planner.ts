import type { Block, Now, PlanResult, Settings, Warning, Win, Work } from './types.ts';

const hm = (h: number, m = 0) => h * 60 + m;
const wk: Win[] = [{ start: hm(15, 30), end: hm(20, 30) }, { start: hm(21, 15), end: hm(22) }];
const we: Win[] = [{ start: hm(10), end: hm(13, 30) }, { start: hm(16), end: hm(20, 30) }, { start: hm(21, 15), end: hm(22) }];
/** Valores iniciales editables. Lun/Mar descuentan llegada a casa (16:30 / 17:10) y cena. */
export const DEFAULT_SETTINGS: Settings = {
  availability: { 0: we, 1: [{ start: hm(17), end: hm(20, 30) }, { start: hm(21, 15), end: hm(22) }],
    2: [{ start: hm(17, 40), end: hm(20, 30) }, { start: hm(21, 15), end: hm(22) }], 3: wk, 4: wk, 5: wk, 6: we },
  blockedDates: [], maxDayMin: 240, preferredMin: 50, maxSessionMin: 90, minSessionMin: 25, minGapMin: 10, horizonDays: 28,
};
/** Función de prioridad: desempate entre demandas con el mismo plazo. Ajustable. */
export const PRIORITY_WEIGHTS = { importance: 2, difficulty: 1, exam: 3, unreadiness: 2, urgency: 10, undated: 4 };
/** Tareas SIN fecha: no son «para nunca». Se planifican dentro de una ventana móvil (UNDATED_SPAN días) y compiten como si vencieran
 *  dentro de UNDATED_KEY días, de modo que se colocan después de lo urgente pero antes que lo que vence más tarde. Cuanto más tiempo
 *  llevan esperando, más urgencia ganan (cada 2 días pierden 1 día de margen). */
export const NO_DATE = '9999-12-31', UNDATED_SPAN = 14, UNDATED_KEY = 6;
export const isUndated = (w: { noDate?: boolean; dueDate: string }) => !!w.noDate || w.dueDate === NO_DATE;
const ageDays = (w: Work, now: Now) => w.createdAt ? Math.max(0, Math.floor((Date.parse(now.date + 'T00:00:00Z') - w.createdAt) / 864e5)) : 0;
export const REVIEW_SHARE = 0.25;   // parte del trabajo de un examen reservada a repaso final
export const REVIEW_DAYS = 2;       // el repaso ocupa los últimos N días antes del examen
export const EXAM_BUFFER_MIN = 60;  // margen antes de la hora del examen el mismo día

export const addDays = (d: string, n: number) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const weekday = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay();
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
const dur = (b: { start: number; end: number }) => b.end - b.start;
const up5 = (m: number) => Math.ceil(m / 5) * 5;
/** Franja del día (0: antes de 13:00 · 1: 13–17 · 2: 17–20 · 3: desde las 20:00). */
export const hourBucket = (m: number) => m < 780 ? 0 : m < 1020 ? 1 : m < 1200 ? 2 : 3;
const cmp = (a: Block, b: Block) => a.date.localeCompare(b.date) || a.start - b.start || a.id.localeCompare(b.id);

export function priority(w: Work, now: Now): number {
  const P = PRIORITY_WEIGHTS; const und = isUndated(w), left = und ? Math.max(0, UNDATED_KEY - Math.floor(ageDays(w, now) / 2)) : Math.max(0, daysBetween(now.date, w.dueDate));
  return w.importance * P.importance + w.difficulty * P.difficulty + (w.kind === 'exam' ? P.exam + (100 - w.readiness) / 100 * P.unreadiness : 0) + P.urgency / (left + 1) + (und ? P.undated : 0);
}
/** Minutos totales a trabajar. Examen: la preparación actual reduce hasta un 50 % la estimación. */
export const totalNeed = (w: Work) => w.estimate ? w.estimate.remainingMin : w.kind === 'exam' ? Math.round(w.estMin * (1 - 0.5 * w.readiness / 100)) : w.estMin;

export function subtract(wins: Win[], cuts: Win[]): Win[] {
  let out = wins.map(w => ({ ...w }));
  for (const c of cuts) {
    const next: Win[] = [];
    for (const w of out) {
      if (c.end <= w.start || c.start >= w.end) { next.push(w); continue; }
      if (c.start > w.start) next.push({ start: w.start, end: c.start });
      if (c.end < w.end) next.push({ start: c.end, end: w.end });
    }
    out = next;
  }
  return out.filter(w => w.end > w.start).sort((a, b) => a.start - b.start);
}

interface Demand { key: string; w: Work; part: 'main' | 'review'; need: number; from: string; to: string; ext?: string; last: string; cutoff: number; prio: number; clipped: boolean }
interface Day { occ: (Win & { sub?: string })[]; total: number; perWork: Map<string, number> }

/** Planificador determinista e idempotente. Función pura: (estado, ahora) → nuevo estado. */
export function plan(input: { settings: Settings; works: Work[]; blocks: Block[]; boost?: Record<string, number>; avoid?: { hours: number[]; days: number[] }; activities?: { date: string; start: number | null; end: number | null; status: string }[] }, now: Now): PlanResult {
  const s = input.settings;
  const active = (w?: Work) => !!w && (w.status === 'pending' || w.status === 'in_progress');
  const byId = new Map(input.works.map(w => [w.id, w]));
  const isPast = (b: Block) => b.date < now.date || (b.date === now.date && b.end <= now.minute);

  const history: Block[] = [], manualF: Block[] = [], autoF: Block[] = [], missed: Block[] = [];
  for (const b of input.blocks) {
    if (b.status !== 'planned') history.push(b);
    else if (isPast(b)) missed.push({ ...b });
    else if (b.manual) manualF.push(b); else autoF.push(b);
  }
  const days = new Map<string, Day>();
  const day = (d: string) => { let x = days.get(d); if (!x) { x = { occ: [], total: 0, perWork: new Map() }; days.set(d, x); } return x; };
  const occupy = (b: Block) => { const x = day(b.date); x.occ.push({ start: b.start, end: b.end, sub: byId.get(b.workId)?.subjectId }); x.total += dur(b); x.perWork.set(b.workId, (x.perWork.get(b.workId) ?? 0) + dur(b)); };
  history.filter(b => b.status === 'done').forEach(occupy);
  manualF.forEach(occupy);
  // Ejercicio y actividades con hora: tiempo OCUPADO (no cuenta para el tope diario de estudio). El estudio automático se coloca alrededor; nunca se mueve a la fuerza.
  for (const a of input.activities ?? []) if (a.status !== 'skipped' && a.start != null && a.end != null) day(a.date).occ.push({ start: a.start, end: a.end });
  const free = (date: string, clip: boolean) => {
    const cuts: Win[] = [...s.blockedDates.filter(b => b.date === date), ...day(date).occ.map(o => ({ start: o.start - s.minGapMin, end: o.end + s.minGapMin }))];
    if (clip && date === now.date) cuts.push({ start: 0, end: up5(now.minute) });
    return subtract(s.availability[weekday(date)] ?? [], cuts);
  };

  // 1) Demandas por trabajo activo
  const warnings: Warning[] = [], demands: Demand[] = [];
  const horizonEnd = addDays(now.date, s.horizonDays);
  for (const w of input.works.filter(active)) {
    const done = w.estimate ? 0 /* el estimador ya descuenta el progreso */ : history.filter(b => b.workId === w.id && b.status === 'done').reduce((a, b) => a + (b.actualMin ?? dur(b)), 0);
    const manual = manualF.filter(b => b.workId === w.id).reduce((a, b) => a + dur(b), 0);
    const f = w.kind === 'exam' ? (input.boost?.[w.subjectId] ?? 1) : 1; // más horas de examen donde la brecha con el objetivo es mayor
    const need = Math.max(0, (f === 1 ? totalNeed(w) : Math.round(totalNeed(w) * f / 5) * 5) - done - manual);
    const und = isUndated(w);
    const overdue = !und && (w.dueDate < now.date || (w.dueDate === now.date && w.dueMinute !== undefined && w.dueMinute <= now.minute));
    if (overdue) warnings.push({ workId: w.id, type: 'overdue', message: `"${w.title}" está atrasada (${w.dueDate}).` });
    let last = overdue ? now.date : und ? addDays(now.date, UNDATED_SPAN - 1) : w.dueDate; const clipped = !und && last > horizonEnd; if (last > horizonEnd) last = horizonEnd;
    const key = und ? addDays(now.date, UNDATED_KEY) : last;
    const cutoff = overdue || clipped || und ? 1440 : w.kind === 'exam' ? (w.dueMinute ?? hm(9)) - EXAM_BUFFER_MIN : (w.dueMinute ?? 1440);
    const base = { key, w, from: now.date, last, cutoff, prio: priority(w, now), clipped };
    const mainTo = addDays(w.dueDate, -(REVIEW_DAYS + 1));
    if (w.kind === 'exam' && !overdue && !clipped && need > 0 && mainTo >= now.date) {
      const review = Math.min(need, Math.round(need * REVIEW_SHARE / 5) * 5);
      demands.push({ ...base, part: 'main', need: need - review, to: mainTo, ext: last });
      demands.push({ ...base, part: 'review', need: review, from: addDays(w.dueDate, -REVIEW_DAYS) > now.date ? addDays(w.dueDate, -REVIEW_DAYS) : now.date, to: last });
    } else demands.push({ ...base, part: 'main', need, to: last });
  }
  demands.sort((a, b) => a.key.localeCompare(b.key) || b.prio - a.prio || a.w.id.localeCompare(b.w.id) || a.part.localeCompare(b.part));

  // 2) Conservar sesiones automáticas aún válidas (evita cambios innecesarios)
  const used = new Set(input.blocks.map(b => b.id));
  const kept: Block[] = [], created: Block[] = [], rem = new Map<Demand, number>();
  for (const d of demands) {
    let have = 0;
    for (const b of autoF.filter(x => x.workId === d.w.id && (x.part ?? 'main') === d.part).sort(cmp)) {
      if (b.date < d.from || b.date > (d.ext ?? d.to) || (b.date === d.last && b.end > d.cutoff) || have + dur(b) > d.need) continue;
      if (!free(b.date, false).some(f => f.start <= b.start && b.end <= f.end) || day(b.date).total + dur(b) > s.maxDayMin) continue;
      occupy(b); kept.push(b); have += dur(b);
    }
    rem.set(d, d.need - have);
  }

  // 3) Cubrir lo que falta: sesiones repartidas por los días menos cargados
  const fill = (d: Demand, to: string, left: number): number => {
    while (left > 0) {
      let len = Math.min(s.preferredMin, left);
      if (left - len > 0 && left - len < s.minSessionMin) len = Math.min(left, s.maxSessionMin);
      const cands: { dt: string; start: number; L: number; key: [number, number, number, number, string] }[] = [];
      const avH = new Set(input.avoid?.hours ?? []), avD = new Set(input.avoid?.days ?? []);
      for (const strict of [true, false]) {
        for (let dt = d.from; dt <= to; dt = addDays(dt, 1)) {
          const x = day(dt), capLeft = s.maxDayMin - x.total; if (capLeft <= 0) continue;
          const fr = free(dt, true), easy = d.w.difficulty <= 2 && d.w.kind === 'task' && !isUndated(d.w) ? [...fr].reverse() : fr; // lo fácil, más tarde; lo difícil, a primera hora
          let pick: { start: number; L: number; bad: number } | null = null;
          for (const f of easy) {
            const st = up5(f.start), end = Math.min(f.end, dt === d.last ? d.cutoff : 1440);
            let L = Math.min(len, end - st, capLeft, s.maxSessionMin);
            // no dejar un resto por debajo de la sesión mínima: se acorta ésta (o se descarta en el primer intento)
            if (L < left && left - L < s.minSessionMin) { const L2 = left - s.minSessionMin; if (L2 >= s.minSessionMin) L = L2; else if (strict) continue; }
            if (L < Math.min(s.minSessionMin, left)) continue;
            const bad = avH.has(hourBucket(st)) || avD.has(weekday(dt)) ? 1 : 0;
            if (!pick || bad < pick.bad) pick = { start: st, L, bad };
            if (!bad) break;
          }
          if (pick) { const adj = x.occ.some(o => o.sub === d.w.subjectId && (Math.abs(pick!.start - o.end) <= s.minGapMin + 5 || Math.abs(pick!.start + pick!.L - o.start) <= s.minGapMin + 5)) ? 1 : 0; cands.push({ dt, start: pick.start, L: pick.L, key: [x.perWork.get(d.w.id) ? 1 : 0, pick.bad, adj, x.total, dt] }); }
        }
        if (cands.length) break;
      }
      if (!cands.length) break;
      cands.sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2] || a.key[3] - b.key[3] || a.key[4].localeCompare(b.key[4]));
      const c = cands[0];
      let id = `auto:${d.w.id}:${d.part}:${c.dt}:${c.start}`, k = 1; while (used.has(id)) id = `auto:${d.w.id}:${d.part}:${c.dt}:${c.start}:r${k++}`; used.add(id);
      const b: Block = { id, workId: d.w.id, date: c.dt, start: c.start, end: c.start + c.L, status: 'planned', manual: false, part: d.part };
      occupy(b); created.push(b); left -= c.L;
    }
    return left;
  };
  const deficit = new Map<string, number>(), clippedW = new Set<string>();
  for (const d of demands) {
    let left = fill(d, d.to, rem.get(d)!);
    if (left > 0 && d.ext && d.ext > d.to) left = fill(d, d.ext, left);
    if (left > 0 && !d.clipped) deficit.set(d.w.id, (deficit.get(d.w.id) ?? 0) + left);
    if (d.clipped) clippedW.add(d.w.id);
  }
  for (const [id, min] of deficit) {
    const w = byId.get(id)!, und = isUndated(w), lastD = und ? addDays(now.date, UNDATED_SPAN - 1) : w.dueDate > horizonEnd ? horizonEnd : w.dueDate < now.date ? now.date : w.dueDate;
    const nd = Math.max(1, daysBetween(now.date, lastD) + 1), extra = Math.ceil(min / nd / 5) * 5;
    warnings.push({ workId: id, type: 'deficit', deficitMin: min, message: (und ? `No caben ${min} min de "${w.title}" (sin fecha) en los próximos ${UNDATED_SPAN} días.` : `No caben ${min} min de "${w.title}" antes del ${w.dueDate}.`) + ` Cabría con unos ${extra} min más de estudio al día${und ? '' : ' hasta esa fecha'}, reduciendo la estimación${und ? '' : ' o moviendo la fecha'}.` });
  }

  // 4) Cerrar sesiones incumplidas y ensamblar
  const future = [...manualF, ...kept, ...created];
  const hasFuture = (id: string) => future.some(b => b.workId === id) && active(byId.get(id));
  const closed = missed.map(b => ({ ...b, status: (hasFuture(b.workId) ? 'rescheduled' : 'skipped') as Block['status'] }));
  const keepIds = new Set(kept.map(b => b.id));
  const removed = autoF.filter(b => !keepIds.has(b.id)).map(b => b.id);
  return { blocks: [...history, ...closed, ...future].sort(cmp), created: created.map(b => b.id), removed, statusChanged: closed.map(b => b.id), warnings };
}

/** Capacidad real hasta la fecha límite (misma disponibilidad que el planificador): minutos libres y días distintos con hueco útil.
 *  Excluye las sesiones automáticas pendientes del propio trabajo (se regenerarían); cuenta lo demás como ocupado. */
export function capacityFor(s: Settings, blocks: Block[], now: Now, w: Work, acts: { date: string; start: number | null; end: number | null; status: string }[] = []): { freeMin: number; freeDays: number } {
  const hz = addDays(now.date, s.horizonDays), und = isUndated(w), last = und ? addDays(now.date, Math.min(UNDATED_SPAN - 1, s.horizonDays)) : w.dueDate < now.date ? now.date : w.dueDate > hz ? hz : w.dueDate;
  const cutoff = und ? 1440 : w.kind === 'exam' ? (w.dueMinute ?? hm(9)) - EXAM_BUFFER_MIN : (w.dueMinute ?? 1440);
  let freeMin = 0, freeDays = 0;
  for (let d = now.date; d <= last; d = addDays(d, 1)) {
    const occ = blocks.filter(b => b.date === d && (b.workId === w.id ? b.status === 'done' || (b.status === 'planned' && b.manual) : b.status === 'planned' || b.status === 'done'));
    const cuts: Win[] = [...s.blockedDates.filter(b => b.date === d), ...occ.map(o => ({ start: o.start - s.minGapMin, end: o.end + s.minGapMin })), ...acts.filter(a => a.date === d && a.status !== 'skipped' && a.start != null && a.end != null).map(a => ({ start: a.start! - s.minGapMin, end: a.end! + s.minGapMin }))];
    if (d === now.date) cuts.push({ start: 0, end: up5(now.minute) });
    const wins = subtract(s.availability[weekday(d)] ?? [], cuts).map(x => ({ start: x.start, end: Math.min(x.end, d === last && !und && w.dueDate <= hz ? cutoff : 1440) })).filter(x => x.end > x.start);
    const free = Math.min(wins.reduce((a, x) => a + dur(x), 0), Math.max(0, s.maxDayMin - occ.reduce((a, o) => a + dur(o), 0)));
    freeMin += free; if (free >= s.minSessionMin) freeDays++;
  }
  return { freeMin, freeDays };
}
