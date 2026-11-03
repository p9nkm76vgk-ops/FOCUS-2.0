import type { Block, Now, PlanResult, Settings, Warning, Win, Work } from './types.ts';

const hm = (h: number, m = 0) => h * 60 + m;
/** Cena y ducha (20:30–22:00): sin estudio por defecto. Editable en Ajustes añadiendo una franja si algún día quieres estudiar más tarde. */
export const CENA: Win = { start: hm(20, 30), end: hm(22) };
/** Ejercicio diario fijo (17:00–17:30): nunca se planifica estudio encima. */
export const EJERCICIO: Win = { start: hm(17), end: hm(18) };
const wk: Win[] = [{ start: hm(15, 30), end: EJERCICIO.start }, { start: EJERCICIO.end, end: hm(20, 30) }];
const we: Win[] = [{ start: hm(10), end: hm(13, 30) }, { start: hm(16), end: EJERCICIO.start }, { start: EJERCICIO.end, end: hm(20, 30) }];
/** Valores iniciales editables. Lun/Mar descuentan llegada a casa (16:30 / 17:10). */
export const DEFAULT_SETTINGS: Settings = {
  availability: { 0: we, 1: [{ start: EJERCICIO.end, end: hm(20, 30) }], 2: [{ start: EJERCICIO.end, end: hm(20, 30) }], 3: wk, 4: wk, 5: wk, 6: we },
  blockedDates: [], maxDayMin: 240, preferredMin: 50, maxSessionMin: 90, minSessionMin: 25, minGapMin: 10, horizonDays: 120,
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
/** Desde esta hora una ventana se considera «después de cenar»: solo se usa si no cabe antes. */
export const LATE_FROM = 20 * 60 + 30;
export const MIN_HOLE = 5;        // hueco mínimo que se compacta
export const MIN_FRAG = 20;       // si ya se colocó parte, un resto menor no se planifica
export const MIN_WORTH = 10;      // restos por debajo de esto no se planifican
export const EXAM_FIRST_DAYS = 14;  // exámenes dentro de este margen tienen prioridad absoluta sobre las entregas
/** PROTECCIÓN DE EXAMEN: los EXAM_GUARD_DAYS días previos (y el propio día) solo se estudia la asignatura del examen; las tareas de otras asignaturas
 *  esperan, salvo que venzan ese mismo día o antes (entonces es su última oportunidad). En esos días el examen recibe además GUARD_MIN_PER_DAY min/día
 *  (exámenes antiguos y repaso: la práctica de recuperación es lo que más rinde justo antes de evaluar). */
export const VISPERA_MIN = 180;
export const EXAM_GUARD_DAYS = 3, EXAM_GUARD_DAYS_HEAVY = 5, GUARD_MIN_PER_DAY = 90;
/** Exámenes de mucho peso (importancia ≥ 4: 80–100 % de la evaluación) protegen 5 días en lugar de 3: es la «semana de examen». */
export const guardDays = (w: { importance?: number }) => (w.importance ?? 3) >= 4 ? EXAM_GUARD_DAYS_HEAVY : EXAM_GUARD_DAYS;
export const examGuard = (works: { kind: string; status: string; auto?: string; subjectId: string; dueDate: string; importance?: number }[], date: string): Set<string> => {
  const g = new Set<string>();
  for (const w of works) if (w.kind === 'exam' && w.auto !== 'review' && (w.status === 'pending' || w.status === 'in_progress')) { const d = daysBetween(date, w.dueDate); if (d >= 0 && d <= guardDays(w)) g.add(w.subjectId); }
  return g;
};
export const TRIM_GAMMA = 0.5;
/** Minutos de la sesión diaria de relleno (estudio diario hasta la PAU). */
export const DAILY_MIN = 45;
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
/** Refuerzo de exámenes: ventanas EXTRA con fecha (p. ej. 06:00–07:00 y 22:00–23:00 durante dos semanas). Suben también el tope del día en lo que suman. */
const extraOnS = (s: Settings, d: string): Win[] => (s.extra ?? []).filter(e => e.date === d).map(e => ({ start: e.start, end: e.end }));
export const availOf = (s: Settings, d: string): Win[] => [...extraOnS(s, d), ...(s.availability[weekday(d)] ?? [])].sort((a, b) => a.start - b.start);
export const maxOfS = (s: Settings, d: string): number => { const wd = weekday(d); return ((wd === 0 || wd === 6) && s.maxDayWeekend ? Math.max(s.maxDayMin, s.maxDayWeekend) : s.maxDayMin) + extraOnS(s, d).reduce((a, w) => a + dur(w), 0); };
export function plan(input: { settings: Settings; works: Work[]; blocks: Block[]; boost?: Record<string, number>; avoid?: { hours: number[]; days: number[] }; activities?: { date: string; start: number | null; end: number | null; status: string }[] }, now: Now): PlanResult {
  const s = input.settings;
  const active = (w?: Work) => !!w && (w.status === 'pending' || w.status === 'in_progress');
  const byId = new Map(input.works.map(w => [w.id, w]));
  const isPast = (b: Block) => b.date < now.date || (b.date === now.date && b.end <= now.minute);

  const history: Block[] = [], manualF: Block[] = [], autoF: Block[] = [], missed: Block[] = [];
  for (const b of input.blocks) {
    if (b.status !== 'planned') history.push(b);
    else if (b.running) manualF.push(b); // cronómetro en marcha: nunca se cierra ni se mueve aunque pase su hora
    else if (isPast(b)) missed.push({ ...b });
    else if (b.manual) manualF.push(b); else autoF.push(b);
  }
  const days = new Map<string, Day>();
  const day = (d: string) => { let x = days.get(d); if (!x) { x = { occ: [], total: 0, perWork: new Map() }; days.set(d, x); } return x; };
  const avail = (d: string): Win[] => availOf(s, d), maxOf = (d: string): number => maxOfS(s, d);
  const dayCap = (d: string) => Math.max(60, Math.min(maxOf(d), avail(d).reduce((a, w) => a + dur(w), 0)));
  const capCache = new Map<string, number>();
  const occupy = (b: Block) => { capCache.delete(b.date); const x = day(b.date); x.occ.push({ start: b.start, end: b.end, sub: byId.get(b.workId)?.subjectId }); x.total += dur(b); x.perWork.set(b.workId, (x.perWork.get(b.workId) ?? 0) + dur(b)); };
  history.filter(b => b.status === 'done').forEach(occupy);
  manualF.forEach(occupy);
  // Sesiones que el usuario ha dicho que NO hará (hoy o más adelante): ese hueco es suyo (cena, descanso…); no se vuelve a rellenar con estudio.
  for (const b of history) if (b.status === 'skipped' && b.reason && b.date >= now.date) day(b.date).occ.push({ start: b.start, end: b.end });
  // Ejercicio y actividades con hora: tiempo OCUPADO (no cuenta para el tope diario de estudio). El estudio automático se coloca alrededor; nunca se mueve a la fuerza.
  for (const a of input.activities ?? []) if (a.status !== 'skipped' && a.start != null && a.end != null) day(a.date).occ.push({ start: a.start, end: a.end });
  const free = (date: string, clip: boolean) => {
    const cuts: Win[] = [...s.blockedDates.filter(b => b.date === date), ...day(date).occ.map(o => ({ start: o.start - s.minGapMin, end: o.end + s.minGapMin }))];
    if (clip && date === now.date) cuts.push({ start: 0, end: up5(now.minute) });
    return subtract(avail(date), cuts);
  };

  // 1) Demandas por trabajo activo
  const warnings: Warning[] = [], demands: Demand[] = [];
  const horizonEnd = addDays(now.date, s.horizonDays);
  for (const w of input.works.filter(w => active(w) && !w.daily)) {
    if (w.planFrom && w.dueDate > horizonEnd) continue; // examen provisional aún fuera del horizonte: sin sesiones todavía
    const done = w.estimate ? 0 /* el estimador ya descuenta el progreso */ : history.filter(b => b.workId === w.id && b.status === 'done').reduce((a, b) => a + (b.actualMin ?? dur(b)), 0);
    const manual = manualF.filter(b => b.workId === w.id).reduce((a, b) => a + dur(b), 0);
    const f = w.kind === 'exam' ? (input.boost?.[w.subjectId] ?? 1) : 1; // más horas de examen donde la brecha con el objetivo es mayor
    let need = Math.max(0, (f === 1 ? totalNeed(w) : Math.round(totalNeed(w) * f / 5) * 5) - done - manual);
    if (need > 0 && need < MIN_FRAG && (done > 0 || (w.estimate?.investedMin ?? 0) > 0)) need = 0; // tras avanzar, un resto menor de 20 min no merece una sesión: se da por cubierto
    if (w.kind === 'exam' && w.auto !== 'review' && w.readiness < 90) { const dl = daysBetween(now.date, w.dueDate); if (dl >= 0 && dl <= guardDays(w)) need = Math.max(need, GUARD_MIN_PER_DAY * (dl + (w.dueMinute !== undefined && w.dueMinute < hm(12) ? 0 : 1))); }
    const und = isUndated(w);
    const overdue = !und && (w.dueDate < now.date || (w.dueDate === now.date && w.dueMinute !== undefined && w.dueMinute <= now.minute));
    if (overdue) warnings.push({ workId: w.id, type: 'overdue', message: `"${w.title}" está atrasada (${w.dueDate}).` });
    let last = overdue ? now.date : und ? addDays(now.date, UNDATED_SPAN - 1) : w.dueDate; const clipped = !und && last > horizonEnd; if (last > horizonEnd) last = horizonEnd;
    const key = und ? addDays(now.date, UNDATED_KEY) : last;
    const cutoff = overdue || clipped || und ? 1440 : w.kind === 'exam' ? (w.dueMinute ?? hm(9)) - EXAM_BUFFER_MIN : (w.dueMinute ?? 1440);
    const base = { key, w, from: w.planFrom && w.planFrom > now.date ? w.planFrom : now.date, last, cutoff, prio: priority(w, now), clipped };
    const mainTo = addDays(w.dueDate, -(REVIEW_DAYS + 1));
    if (w.kind === 'exam' && !overdue && !clipped && need > 0 && mainTo >= now.date && Math.min(need, Math.round(need * REVIEW_SHARE / 5) * 5) >= 15 && need - Math.round(need * REVIEW_SHARE / 5) * 5 >= 15) {
      const sem = (s.extra ?? []).some(e => e.ex && e.date === addDays(w.dueDate, -1)); // semana de exámenes: el repaso de la víspera pesa más
      let review = Math.min(need, Math.round((sem ? Math.min(need * 0.6, Math.max(need * REVIEW_SHARE, 2 * VISPERA_MIN * 0.67)) : need * REVIEW_SHARE) / 5) * 5); if (review < 15 || need - review < 15) review = 0; // sin repaso ni sesiones principales diminutas
      demands.push({ ...base, part: 'main', need: need - review, to: mainTo, ext: last });
      demands.push({ ...base, part: 'review', need: review, from: addDays(w.dueDate, -REVIEW_DAYS) > base.from ? addDays(w.dueDate, -REVIEW_DAYS) : base.from, to: last });
    } else demands.push({ ...base, part: 'main', need, to: last });
  }
  // Los repasos del temario (cortos) se colocan DESPUÉS de lo grande, para pegarse a los días que ya tienen estudio en vez de abrir días por su cuenta.
  /** Los exámenes próximos (≤ EXAM_FIRST_DAYS) se colocan SIEMPRE antes que cualquier entrega: puntúan más que una tarea. Una entrega solo ocupa lo que el examen deja libre. */
  const tier = (d: Demand) => d.w.auto === 'review' ? 2 : d.w.kind === 'exam' && daysBetween(now.date, d.w.dueDate) <= EXAM_FIRST_DAYS ? 0 : 1;
  demands.sort((a, b) => tier(a) - tier(b) || a.key.localeCompare(b.key) || b.prio - a.prio || a.w.id.localeCompare(b.w.id) || a.part.localeCompare(b.part));

  /** Semana de exámenes (no cabe todo): la capacidad se reparte entre los exámenes con «llenado por nivel» (cada uno recibe como mucho el mismo nivel L; lo que sobra va a los más urgentes).
   *  Sin esto, el examen más cercano se lleva todas las horas y los demás se quedan en cero. Es una función pura de los datos (no depende de las sesiones ya creadas), así que es estable al repetir.
   *  Si todo cabe (necesidad ≤ 90 % de la capacidad), no cambia nada. */
  const trimmed = new Map<string, number>();
  {
    const exD = demands.filter(d => d.w.kind === 'exam' && d.w.auto !== 'review' && !d.clipped && d.need > 0), ids = [...new Set(exD.map(d => d.w.id))];
    if (ids.length > 1) {
      const tot = new Map<string, number>(); for (const d of exD) tot.set(d.w.id, (tot.get(d.w.id) ?? 0) + d.need);
      // Plazos escalonados: un examen solo puede usar la capacidad de los días hasta su fecha. Se busca el mayor nivel T tal que, para CADA fecha límite,
      // la suma de min(necesidad, T) de los exámenes que vencen hasta ella cabe en el 80 % de la capacidad hasta esa fecha.
      const lastOf = new Map<string, string>(); for (const d of exD) lastOf.set(d.w.id, !lastOf.has(d.w.id) || d.last > lastOf.get(d.w.id)! ? d.last : lastOf.get(d.w.id)!);
      const lasts = [...new Set(lastOf.values())].sort(), capTo = new Map<string, number>();
      for (const L of lasts) { let c = 0; for (let dt = now.date; dt <= L; dt = addDays(dt, 1)) c += Math.max(0, Math.min(maxOf(dt) - day(dt).total, free(dt, true).reduce((a, f) => a + f.end - f.start, 0))); capTo.set(L, Math.floor(c * 0.8 / 5) * 5); }
      // Se recorren las fechas límite de menor a mayor: si lo que vence hasta L no cabe, se recorta con «llenado por nivel» SOLO a los exámenes que vencen hasta L (los lejanos no se tocan sin necesidad).
      const T = new Map<string, number>(); for (const id of ids) T.set(id, tot.get(id)!);
      let trimAny = false;
      /* Reparto con rendimientos decrecientes: cada examen recibe como mucho min(necesidad, λ·necesidad^TRIM_GAMMA). Con γ=0 sería «mismas horas para todos»; con γ=1, «mismo porcentaje de cobertura».
       * Con γ=0,5 quien más trabajo tiene (temas en rojo) recibe más horas, pero no a costa de dejar sin cubrir a los que necesitan poco (una hora extra rinde menos donde ya hay base). */
      const wt = (id: string) => Math.pow(tot.get(id)!, TRIM_GAMMA);
      for (const L of lasts) {
        const P = ids.filter(id => lastOf.get(id)! <= L), capL = capTo.get(L)!, sum = (lv: number) => P.reduce((a, id) => a + Math.min(T.get(id)!, lv * wt(id)), 0);
        if (sum(Infinity) <= capL) continue;
        let lo = 0, hi = Math.max(...P.map(id => T.get(id)! / wt(id)));
        for (let it = 0; it < 40 && hi - lo > 1e-6; it++) { const mid = (lo + hi) / 2; if (sum(mid) <= capL) lo = mid; else hi = mid; }
        for (const id of P) T.set(id, Math.min(T.get(id)!, Math.floor(lo * wt(id) / 5) * 5)); trimAny = true;
      }
      if (trimAny) {
        for (const id of ids) {
          const t = T.get(id)!, all = tot.get(id)!; if (t >= all) continue;
          const ds = exD.filter(d => d.w.id === id); let left = t;
          ds.forEach((d, i) => { const n = i === ds.length - 1 ? left : Math.min(left, Math.round(t * d.need / all / 5) * 5); left -= n; d.need = n; });
          trimmed.set(id, all - t);
        }
      }
    }
  }
  // 2) Conservar sesiones automáticas aún válidas (evita cambios innecesarios)
  const used = new Set(input.blocks.map(b => b.id));
  const kept: Block[] = [], created: Block[] = [], rem = new Map<Demand, number>();
  for (const d of demands) {
    let have = 0;
    for (const b of autoF.filter(x => x.workId === d.w.id && (x.part ?? 'main') === d.part).sort(cmp)) {
      if (b.date < d.from || b.date > (d.ext ?? d.to) || (b.date === d.last && b.end > d.cutoff) || have + dur(b) > d.need) continue;
      if (!free(b.date, false).some(f => f.start <= b.start && b.end <= f.end) || day(b.date).total + dur(b) > maxOf(b.date)) continue;
      occupy(b); kept.push(b); have += dur(b);
    }
    const r = d.need - have; rem.set(d, have > 0 && r < MIN_FRAG ? 0 : r); // resto diminuto tras conservar sesiones: se da por cubierto
  }

  // 2b) Guardia de factibilidad (solo exámenes con ventana desde hoy): una sesión de un examen no puede ocupar un día si, al hacerlo, a algún examen con plazo igual o anterior
  //     ya no le cabría lo que le falta (condición de Hall para ventanas anidadas: para cada plazo, lo pendiente de los exámenes que vencen hasta él ≤ capacidad restante hasta él).
  //     Así los exámenes más lejanos pueden repartirse por toda su ventana sin quitar sitio a los más cercanos.
  const gR = new Map<string, number>(), gLast = new Map<string, string>(); let gDl: string[] = [];
  for (const d of demands) if (d.w.kind === 'exam' && d.w.auto !== 'review' && !d.clipped && d.from === now.date && (rem.get(d) ?? 0) > 0) { gR.set(d.w.id, (gR.get(d.w.id) ?? 0) + rem.get(d)!); gLast.set(d.w.id, d.last); }
  gDl = [...new Set(gLast.values())].sort();
  const GUARD_SLACK = 0.92;
  const capG = (dt: string): number => { let c = capCache.get(dt); if (c === undefined) { const x = day(dt); c = Math.floor(Math.max(0, Math.min(maxOf(dt) - x.total, free(dt, true).reduce((a, f) => a + dur(f), 0))) * GUARD_SLACK); capCache.set(dt, c); } return c; };
  const guardOK = (d: Demand, dt: string, L: number): boolean => {
    if (!gDl.length || !gR.has(d.w.id)) return true;
    const mine = gLast.get(d.w.id)!;
    for (const D of gDl) {
      if (dt >= D) continue;
      let need = 0; for (const [id, r] of gR) if (gLast.get(id)! <= D) need += r;
      if (mine <= D) need -= L;
      let cap = 0; for (let x = now.date; x < D; x = addDays(x, 1)) cap += capG(x);
      cap -= L; // el hueco del día dt baja L
      if (need > cap) return false;
    }
    return true;
  };

  // 3) Cubrir lo que falta: sesiones repartidas por los días menos cargados
  const placedOnce = new Set<Demand>(), placedN = new Map<Demand, number>();
  const fill = (d: Demand, to: string, left: number, once = false, guard = false): number => {
    const left0 = left;
    while (left > 0) {
      if (left < MIN_FRAG && (left < left0 || (once && placedOnce.has(d)))) { left = 0; break; } // el resto de una demanda ya cubierta (<20 min) no merece otra sesión
      let len = Math.min(s.preferredMin, left);
      if (left - len > 0 && left - len < s.minSessionMin) len = Math.min(left, s.maxSessionMin);
      const cands: { dt: string; start: number; L: number; key: (number | string)[] }[] = [];
      const avH = new Set(input.avoid?.hours ?? []), avD = new Set(input.avoid?.days ?? []), rev = d.w.auto === 'review';
      for (const strict of [true, false]) {
        for (let dt = d.from; dt <= to; dt = addDays(dt, 1)) {
          const x = day(dt), capLeft = maxOf(dt) - x.total; if (capLeft <= 0) continue;
          if (d.w.kind !== 'exam') { const gd = examGuard(input.works, dt); if (gd.size && !gd.has(d.w.subjectId) && !(dt >= d.w.dueDate && !isUndated(d.w))) continue; } // protección de examen
          const fr = free(dt, true), ord = d.w.difficulty <= 2 && d.w.kind === 'task' && !isUndated(d.w) ? [...fr].reverse() : fr; // lo fácil, más tarde; lo difícil, a primera hora
          const opts: { start: number; L: number; bad: number; sec: number; packed: number; adj: number }[] = [];
          for (const f of ord) {
            const st = up5(f.start), end = Math.min(f.end, dt === d.last ? d.cutoff : 1440);
            let L = Math.min(len, end - st, capLeft, s.maxSessionMin);
            // no dejar un resto por debajo de la sesión mínima: se acorta ésta (o se descarta en el primer intento)
            if (L < left && left - L < s.minSessionMin) { const L2 = left - s.minSessionMin; if (L2 >= s.minSessionMin) L = L2; else if (strict) continue; }
            if (L < Math.min(s.minSessionMin, left)) continue;
            const near = (g: number) => g >= 0 && g <= s.minGapMin + 5;
            opts.push({ start: st, L, bad: avH.has(hourBucket(st)) || avD.has(weekday(dt)) ? 1 : 0, sec: st >= LATE_FROM ? 1 : 0, packed: x.occ.some(o => near(st - o.end) || near(o.start - (st + L))) ? 1 : 0, adj: x.occ.some(o => o.sub === d.w.subjectId && (near(st - o.end) || near(o.start - (st + L)))) ? 1 : 0 });
          }
          if (!opts.length) continue;
          const hasStudy = x.total > 0, score = (o: typeof opts[0]) => o.bad * 8 + o.sec * 4 + o.adj * 2 + (hasStudy && !o.packed ? 1 : 0);
          let pick = opts[0]; for (const o of opts) if (score(o) < score(pick)) pick = o; // la mejor ventana del día (a igualdad, la primera en el orden)
          const eve = trimmed.size === 0 && d.w.kind === 'exam' && !rev && !isUndated(d.w) && dt === addDays(d.w.dueDate, -1) && (x.perWork.get(d.w.id) ?? 0) < VISPERA_MIN ? 0 : 1; // víspera: el examen de mañana se repasa a fondo (hasta VISPERA_MIN min)
          /* con exceso de carga, cada examen prefiere el último 60 % de su ventana (los días iniciales se dejan a los plazos más cercanos); si no hay sitio, usa los anteriores */
          const near14 = d.w.kind === 'exam' && daysBetween(now.date, d.w.dueDate) <= EXAM_FIRST_DAYS; /* los exámenes lejanos se reparten por carga, no se amontonan en los primeros días */
          const tooEarly = trimmed.size > 0 && near14 && !rev && !isUndated(d.w) && dt < addDays(now.date, Math.floor(0.4 * Math.max(0, daysBetween(now.date, d.w.dueDate)))) ? 1 : 0;
          const load = trimmed.size > 0 && near14 ? 0 : Math.round(10 * x.total / dayCap(dt)), /* con exceso de carga, los plazos más cercanos ocupan los primeros días y dejan los últimos a los demás */ noPack = hasStudy && !pick.packed ? 1 : 0, sameWork = eve === 0 ? 0 : x.perWork.get(d.w.id) ? 1 : 0;
          // Patrón: 1) no repetir el mismo trabajo el mismo día · 2) evitar franjas que fallas · 3) la franja de después de cenar solo como último recurso ·
          // 4) los repasos cortos se pegan a días que ya tienen estudio (no abren un día por sí solos) · 5) repartir por carga relativa · 6) sesiones seguidas, sin huecos · 7) alternar asignaturas
          /* examen lejano (ventana ≥ 21 días): las sesiones se reparten a lo largo de toda la ventana en vez de ocupar los primeros días consecutivos */
          const spread = d.w.kind === 'exam' && !rev && daysBetween(d.from, to) >= 21, nS = Math.max(1, Math.ceil(d.need / s.preferredMin)), tgt = Math.floor(((placedN.get(d) ?? 0) + 0.5) * (daysBetween(d.from, to) + 1) / nS), dist = spread ? Math.abs(daysBetween(d.from, dt) - tgt) : 0;
          if (guard && !guardOK(d, dt, pick.L)) continue;
          cands.push({ dt, start: pick.start, L: pick.L, key: rev ? [sameWork, pick.bad, pick.sec, hasStudy ? 0 : 1, pick.adj, noPack, load, dt] : [eve, sameWork, pick.bad, pick.sec, pick.adj, tooEarly, dist, load, noPack, dt] });
        }
        if (cands.length) break;
      }
      if (!cands.length) break;
      cands.sort((a, b) => { for (let i = 0; i < a.key.length; i++) { const u = a.key[i], v = b.key[i]; if (u !== v) return typeof u === 'number' ? u - (v as number) : String(u).localeCompare(String(v)); } return 0; });
      const c = cands[0];
      let id = `auto:${d.w.id}:${d.part}:${c.dt}:${c.start}`, k = 1; while (used.has(id)) id = `auto:${d.w.id}:${d.part}:${c.dt}:${c.start}:r${k++}`; used.add(id);
      const b: Block = { id, workId: d.w.id, date: c.dt, start: c.start, end: c.start + c.L, status: 'planned', manual: false, part: d.part };
      occupy(b); created.push(b); left -= c.L; placedOnce.add(d); if (gR.has(d.w.id)) gR.set(d.w.id, Math.max(0, gR.get(d.w.id)! - c.L)); placedN.set(d, (placedN.get(d) ?? 0) + 1);
      if (once) break;
    }
    return left;
  };
  const deficit = new Map<string, number>([...trimmed]), clippedW = new Set<string>();
  /* Reparto por rondas: dentro de cada nivel de prioridad, cada demanda coloca UNA sesión por ronda (en el orden de siempre). Así los exámenes avanzan a la vez por los días libres
   * y el último examen no se queda solo con los huecos de la víspera. Las más grandes (temas en rojo) siguen recibiendo más sesiones porque tardan más rondas en cubrirse. Determinista. */
  const lefts = new Map<Demand, number>(demands.map(d => [d, rem.get(d)!]));
  for (const tr of [0, 1, 2]) {
    const grp = demands.filter(d => tier(d) === tr);
    for (const guarded of [true, false]) { // primero con guardia de factibilidad (reparto), después sin ella (aprovechar lo que quede, por plazo)
      const stuck = new Set<Demand>();
      for (let iter = 0; iter < 2000; iter++) {
        let moved = false;
        for (const d of grp) {
          const l0 = lefts.get(d)!; if (l0 <= 0 || stuck.has(d)) continue;
          let l = fill(d, d.to, l0, true, guarded);
          if (l === l0 && l > 0 && d.ext && d.ext > d.to) l = fill(d, d.ext, l, true, guarded);
          lefts.set(d, l); if (l < l0) moved = true; else stuck.add(d);
        }
        if (!moved) break;
      }
    }
  }
  for (const d of demands) {
    const left = lefts.get(d)!;
    if (left > 0 && !d.clipped) deficit.set(d.w.id, (deficit.get(d.w.id) ?? 0) + left);
    if (d.clipped) clippedW.add(d.w.id);
  }
  for (const [id, min] of deficit) {
    const w = byId.get(id)!, und = isUndated(w), lastD = und ? addDays(now.date, UNDATED_SPAN - 1) : w.dueDate > horizonEnd ? horizonEnd : w.dueDate < now.date ? now.date : w.dueDate;
    const nd = Math.max(1, daysBetween(now.date, lastD) + 1), extra = Math.ceil(min / nd / 5) * 5;
    warnings.push({ workId: id, type: 'deficit', deficitMin: min, message: (und ? `No caben ${min} min de "${w.title}" (sin fecha) en los próximos ${UNDATED_SPAN} días.` : `No caben ${min} min de "${w.title}" antes del ${w.dueDate}.`) + ` Cabría con unos ${extra} min más de estudio al día${und ? '' : ' hasta esa fecha'}, reduciendo la estimación${und ? '' : ' o moviendo la fecha'}.` });
  }

  // 3c) Estudio diario hasta la PAU: cada día SIN estudio recibe una sesión corta de la asignatura que toca (reparto ponderado, determinista). Se retira sola en cuanto el día se llena con trabajo real.
  //     Nunca ocupa un día que ya tiene estudio, respeta bloqueos, cena, ejercicio, protección de examen y los días en que dijiste que no harías la sesión.
  if (s.daily && s.daily.subjects.length) {
    const dl = s.daily, until = dl.until < addDays(now.date, 400) ? dl.until : addDays(now.date, 400), L0 = Math.max(s.minSessionMin, dl.min ?? DAILY_MIN);
    const isD = (b: Block) => !!byId.get(b.workId)?.daily;
    const skipDay = new Set<string>([...history, ...missed].filter(isD).map(b => b.date));
    const credit = new Map<string, number>(), nTop = new Map<string, number>();
    for (const dt of [...skipDay]) { const hb = history.find(b => isD(b) && b.date === dt); if (hb) { const sid = byId.get(hb.workId)!.subjectId; nTop.set(sid, (nTop.get(sid) ?? 0) + 1); } }
    const avH = new Set(input.avoid?.hours ?? []), avD = new Set(input.avoid?.days ?? []);
    // Cuotas semanales por asignatura (minutos/semana, ya inclinadas hacia el principio): el relleno cubre lo que falta de cada una hasta alcanzar el objetivo de horas del día.
    const hasQ = dl.subjects.some(u => (u.q ?? 0) > 0), t0 = now.date, span = Math.max(1, daysBetween(t0, until));
    const tiltAt = (dt: string) => { const t = dl.tilt ?? [1, 1]; return t[0] + (t[1] - t[0]) * Math.min(1, Math.max(0, daysBetween(t0, dt) / span)); };
    const weekMin = (dt: string, sid: string) => { const m = addDays(dt, -((weekday(dt) + 6) % 7)); let t = 0; for (let i = 0; i < 7; i++) for (const o of day(addDays(m, i)).occ) if (o.sub === sid) t += o.end - o.start; return t; };
    const oldMulti = new Map<string, Block[]>(); for (const b of autoF.filter(isD).sort(cmp)) oldMulti.set(b.date, [...(oldMulti.get(b.date) ?? []), b]);
    const dayTarget = (dt: string) => { const we = weekday(dt) === 0 || weekday(dt) === 6; return Math.min(maxOf(dt), (we ? dl.we : dl.wk) ?? (hasQ ? 0 : 1)); };
    for (let dt = now.date; dt <= until; dt = addDays(dt, 1)) {
      let x = day(dt); if (skipDay.has(dt)) continue;
      const tgt = hasQ ? dayTarget(dt) : 1; if (hasQ ? x.total >= tgt - 20 : x.total > 0) continue; if (maxOf(dt) - x.total <= 0) continue;
      // Examen ese mismo día: esa asignatura ya no se repasa; el relleno va antes del examen o ≥ 3 h después de su inicio (nunca durante).
      const gd = examGuard(input.works, dt), today = new Set<string>(); let cut = 1440, after = 1440;
      for (const w of input.works) if (active(w) && w.kind === 'exam' && w.auto !== 'review' && w.dueDate === dt) { today.add(w.subjectId); const st = w.dueMinute ?? hm(9); cut = Math.min(cut, st - EXAM_BUFFER_MIN); after = Math.min(after, st + 180); }
      let cand = dl.subjects.filter(u => (!gd.size || gd.has(u.id)) && !today.has(u.id)); if (!cand.length) cand = dl.subjects.filter(u => !today.has(u.id));
      if (!cand.length) continue;
      const tw = cand.reduce((a, u) => a + u.w, 0); for (const u of cand) credit.set(u.id, (credit.get(u.id) ?? 0) + u.w);
      const keepOld = oldMulti.get(dt) ?? [];
      for (let guard = 0; guard < 8; guard++) {
        x = day(dt); const capLeft = maxOf(dt) - x.total; if (capLeft <= 0) break; if (hasQ ? x.total >= tgt - 20 : guard > 0) break;
        const wins = free(dt, true).flatMap(f => today.size ? [{ start: up5(f.start), end: Math.min(f.end, cut) }, { start: up5(Math.max(f.start, after)), end: f.end }] : [{ start: up5(f.start), end: f.end }]).filter(f => f.end - f.start >= Math.min(L0, s.minSessionMin));
        if (!wins.length) break;
        const ok = (b: Block) => wins.some(f => f.start <= b.start && b.end <= f.end) && dur(b) <= capLeft && (!hasQ || x.total + dur(b) <= tgt + 20);
        const o = keepOld.find(b => cand.some(u => u.id === byId.get(b.workId)!.subjectId) && ok(b));
        if (o) { const oSub = byId.get(o.workId)!.subjectId; keepOld.splice(keepOld.indexOf(o), 1); occupy(o); kept.push(o); credit.set(oSub, (credit.get(oSub) ?? 0) - tw); nTop.set(oSub, (nTop.get(oSub) ?? 0) + 1); continue; }
        // Asignatura: la que más le falta para su cuota semanal (otra distinta a las ya puestas hoy si es posible); sin cuotas, rotación por crédito.
        let pickS = cand[0];
        if (hasQ) { const inDay = new Set(x.occ.map(q => q.sub)); const sc = (u: typeof cand[number]) => { const q = (u.q ?? 0) * tiltAt(dt); return (q > 0 ? 100 * (q - weekMin(dt, u.id)) / q : -100) + (inDay.has(u.id) ? -12 : 0) + (u.w * 0.01); }; for (const u of cand) if (sc(u) > sc(pickS) + 1e-9) pickS = u; if ((pickS.q ?? 0) * tiltAt(dt) - weekMin(dt, pickS.id) <= 0 && x.total > 0) break; }
        else for (const u of cand) if ((credit.get(u.id) ?? 0) > (credit.get(pickS.id) ?? 0) + 1e-9) pickS = u;
        const LL = Math.max(L0, Math.min(dl.len ?? L0, s.maxSessionMin));
        let best: { start: number; L: number; sc: number } | null = null;
        for (const f of wins) { const L = Math.min(LL, f.end - f.start, capLeft, s.maxSessionMin); if (L < Math.min(L0, s.minSessionMin)) continue; const sc = (avH.has(hourBucket(f.start)) || avD.has(weekday(dt)) ? 8 : 0) + (f.start >= LATE_FROM ? 4 : 0); if (!best || sc < best.sc) best = { start: f.start, L, sc }; }
        if (!best) break;
        const wid = `daily:${pickS.id}`; if (!byId.has(wid)) break;
        const n = nTop.get(pickS.id) ?? 0, tp = pickS.topics.length ? pickS.topics[n % pickS.topics.length] : null;
        let id = `auto:${wid}:main:${dt}:${best.start}`, k = 1; while (used.has(id)) id = `auto:${wid}:main:${dt}:${best.start}:r${k++}`; used.add(id);
        const b: Block = { id, workId: wid, date: dt, start: best.start, end: best.start + best.L, status: 'planned', manual: false, part: 'main', ...(tp ? { label: tp.name } : {}) };
        occupy(b); created.push(b); credit.set(pickS.id, (credit.get(pickS.id) ?? 0) - tw); nTop.set(pickS.id, n + 1);
      }
    }
  }

  // 3b) Compactar: en los días futuros, un hueco de ≥15 min DENTRO de una ventana se cierra adelantando las sesiones automáticas
  //     (nunca manuales, hechas, ni fuera de la ventana; hoy solo las que empiezan dentro de más de 30 min). Es estable: sobre un plan ya compacto no cambia nada.
  {
    const fx = new Map<string, Win[]>(), add = (m: Map<string, Win[]>, d: string, w: Win) => m.set(d, [...(m.get(d) ?? []), w]);
    for (const b of history) if (b.status === 'done' || (b.status === 'skipped' && b.reason && b.date >= now.date)) add(fx, b.date, { start: b.start, end: b.end });
    for (const b of manualF) add(fx, b.date, { start: b.start, end: b.end });
    for (const a of input.activities ?? []) if (a.status !== 'skipped' && a.start != null && a.end != null) add(fx, a.date, { start: a.start, end: a.end });
    const placed = new Map<string, Win[]>(), autos = [...kept, ...created].sort(cmp), swap = new Map<Block, Block>();
    for (const b of autos) {
      let nb = b;
      if (b.date > now.date || (b.date === now.date && b.start >= up5(now.minute) + 30)) {
        const cuts: Win[] = [...(b.date === now.date ? [{ start: 0, end: up5(now.minute) }] : []), ...s.blockedDates.filter(x => x.date === b.date), ...[...(fx.get(b.date) ?? []), ...(placed.get(b.date) ?? [])].map(o => ({ start: o.start - s.minGapMin, end: o.end + s.minGapMin }))];
        const win = subtract(avail(b.date), cuts).find(w => w.start <= b.start && b.end <= w.end), st = win ? up5(win.start) : b.start;
        const badSlot = (m: number) => (input.avoid?.hours ?? []).includes(hourBucket(m));
        if (win && b.start - st >= MIN_HOLE && !(badSlot(st) && !badSlot(b.start))) {
          let id = `auto:${b.workId}:${b.part ?? 'main'}:${b.date}:${st}`, k = 1; while (used.has(id)) id = `auto:${b.workId}:${b.part ?? 'main'}:${b.date}:${st}:r${k++}`; used.add(id);
          nb = { ...b, id, start: st, end: st + dur(b) }; swap.set(b, nb);
        }
      }
      add(placed, nb.date, { start: nb.start, end: nb.end });
    }
    if (swap.size) {
      for (let i = kept.length - 1; i >= 0; i--) if (swap.has(kept[i])) { created.push(swap.get(kept[i])!); kept.splice(i, 1); }
      for (let i = 0; i < created.length; i++) if (swap.has(created[i])) created[i] = swap.get(created[i])!;
    }
  }

  // 4) Cerrar sesiones incumplidas y ensamblar
  const future = [...manualF, ...kept, ...created];
  const hasFuture = (id: string) => future.some(b => b.workId === id) && active(byId.get(id));
  const closed = missed.map(b => ({ ...b, status: (hasFuture(b.workId) && !byId.get(b.workId)?.daily ? 'rescheduled' : 'skipped') as Block['status'] }));
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
    const wins = subtract(availOf(s, d), cuts).map(x => ({ start: x.start, end: Math.min(x.end, d === last && !und && w.dueDate <= hz ? cutoff : 1440) })).filter(x => x.end > x.start);
    const free = Math.min(wins.reduce((a, x) => a + dur(x), 0), Math.max(0, maxOfS(s, d) - occ.reduce((a, o) => a + dur(o), 0)));
    freeMin += free; if (free >= s.minSessionMin) freeDays++;
  }
  return { freeMin, freeDays };
}
