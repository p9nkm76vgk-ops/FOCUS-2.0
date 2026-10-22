// Fases de preparación de un examen por asignatura. Reparto y textos editables; las fases son SECUENCIALES
// (las primeras sesiones son la fase 1, las últimas la última). Los repartos por defecto son hipótesis del usuario
// apoyadas en la literatura (recuperación activa, práctica distribuida), no valores medidos.
export interface Phase { id: string; label: string; text: string; pct: number }
export interface PlanCfg { pcts?: number[]; texts?: string[]; labels?: string[] }
export type MethodCfg = Record<string, PlanCfg>;

const G = {
  escribir: { id: 'escribir', label: 'Escribir el guion', text: 'Redacta cada concepto o apartado como un guion completo, tal como lo escribirías en el examen (no en viñetas). Un guion por pregunta o concepto.' },
  memorizar: { id: 'memorizar', label: 'Memorizar el guion', text: 'Aprende el guion palabra por palabra: léelo, tápalo y recítalo o escríbelo de memoria; comprueba y repite solo lo que falle.' },
  frio: { id: 'frio', label: 'Prueba en frío', text: 'Sin mirar nada y con tiempo de examen, escribe de memoria un tema o comentario completo. Corrige después con tu guion y marca lo que falló.' },
};
const GUION = [{ ...G.escribir, pct: 35 }, { ...G.memorizar, pct: 50 }, { ...G.frio, pct: 15 }];
const FILO = [{ ...G.escribir, pct: 35 }, { ...G.memorizar, pct: 50 }, { ...G.frio, pct: 15, text: 'Comenta en frío un texto que no hayas visto, con tiempo de examen, usando tu guion de memoria. Después compara con tu guion y apunta lo que falló.' }];

/** Plan por defecto de cada asignatura inicial (clave = nombre). `calc` solo afecta a Business. */
export const PLANS: Record<string, Phase[]> = {
  'Historia de la Filosofía': FILO,
  'Historia de España': GUION,
  'Lengua Castellana': GUION,
  'Catalán': GUION,
  'Business': [{ id: 'memorizar', label: 'Memorizar', pct: 70, text: 'Memoriza conceptos, definiciones y esquemas del tema: léelos, tápalos y recítalos; repite lo que falle.' }, { id: 'problemas', label: 'Problemas', pct: 30, text: 'Resuelve los ejercicios de cálculo de los temas del examen sin mirar la solución; corrige y apunta los fallos.' }],
  'Inglés': [{ id: 'vocab', label: 'Vocabulario y gramática', pct: 25, text: 'Repasa el vocabulario y las estructuras del tema con tarjetas: tapa, recuerda y comprueba.' }, { id: 'redactar', label: 'Redactar y practicar', pct: 75, text: 'Escribe redacciones o ejercicios del tipo del examen con tiempo y corrígelos con la rúbrica.' }],
  'Física': [{ id: 'teoria', label: 'Teoría y fórmulas', pct: 25, text: 'Aprende la teoría y las fórmulas del tema y explica de dónde sale cada una; compruébalo sin mirar.' }, { id: 'problemas', label: 'Problemas', pct: 75, text: 'Resuelve problemas de los temas del examen sin mirar la solución; corrige y repite los que fallen.' }],
  'Química': [{ id: 'teoria', label: 'Teoría y fórmulas', pct: 25, text: 'Aprende la teoría y las fórmulas del tema y explica de dónde sale cada una; compruébalo sin mirar.' }, { id: 'problemas', label: 'Problemas', pct: 75, text: 'Resuelve problemas de los temas del examen sin mirar la solución; corrige y repite los que fallen.' }],
  'Matemáticas II': [{ id: 'teoria', label: 'Teoría mínima', pct: 10, text: 'Lee lo mínimo de teoría y 1–2 ejemplos resueltos del tema, explicando cada paso.' }, { id: 'practicar', label: 'Practicar', pct: 90, text: 'Resuelve problemas de los temas del examen sin ver la solución; corrige y repite los que fallen.' }],
};
export const BUSINESS_THEORY: Phase[] = [{ id: 'memorizar', label: 'Memorizar', pct: 100, text: PLANS['Business'][0].text }];
export const GENERIC_PLAN: Phase[] = [{ id: 'estudiar', label: 'Estudiar', pct: 50, text: 'Estudia el tema y comprueba sin mirar qué recuerdas.' }, { id: 'practicar', label: 'Practicar', pct: 50, text: 'Practica con ejercicios del tipo del examen y corrige los fallos.' }];

export const sumPcts = (p: number[]) => p.reduce((a, b) => a + b, 0);
export const validatePcts = (p: number[]): string | null =>
  p.some(x => !Number.isFinite(x) || x < 0 || x > 100) ? 'Cada porcentaje debe estar entre 0 y 100.' : Math.round(sumPcts(p)) !== 100 ? `Los porcentajes suman ${Math.round(sumPcts(p))} %; deben sumar 100.` : null;

/** Plan por defecto (sin personalizar). Business sin cálculo: una sola fase. */
export const defaultPlan = (name?: string, calc?: boolean): Phase[] =>
  name === 'Business' && !calc ? BUSINESS_THEORY : (PLANS[name ?? ''] ?? GENERIC_PLAN).map(p => ({ ...p }));

/** Plan efectivo: el por defecto con los porcentajes y textos que el usuario haya editado (si son válidos). */
export function planFor(name: string | undefined, calc: boolean | undefined, cfg?: PlanCfg): Phase[] {
  const base = defaultPlan(name, calc);
  if (!cfg) return base;
  const single = base.length === 1, pc = !single && cfg.pcts && cfg.pcts.length === base.length && !validatePcts(cfg.pcts) ? cfg.pcts : null;
  return base.map((p, i) => ({ ...p, pct: pc ? pc[i] : p.pct, label: (cfg.labels?.[i] || '').trim().slice(0, 40) || p.label, text: (cfg.texts?.[i] || '').trim().slice(0, 600) || p.text }));
}

/** Reparte N sesiones (minutos) entre las fases, de forma secuencial. Mínimo de producción: la última fase
 *  recibe como mínimo 2 sesiones o su porcentaje, lo que sea mayor, sin dejar vacías las anteriores si hay sesiones suficientes. */
export function assignPhases(phases: Phase[], mins: number[]): number[] {
  const n = mins.length, P = phases.length;
  if (!n) return [];
  if (P === 1 || n === 1) return mins.map(() => 0);
  const total = mins.reduce((a, b) => a + b, 0) || n, e = P - 1;
  let lastMin = 0, lastK = 0;
  for (let i = n - 1; i >= 0 && lastMin / total < phases[e].pct / 100 - 1e-9; i--) { lastMin += mins[i]; lastK++; }
  lastK = Math.max(lastK, 2);
  lastK = Math.min(lastK, n >= P ? n - e : 1); // las fases anteriores conservan al menos una sesión si caben
  const m = n - lastK, share = phases.slice(0, e).map(p => p.pct), sh = share.reduce((a, b) => a + b, 0) || e;
  const mt = mins.slice(0, m).reduce((a, b) => a + b, 0) || m, out: number[] = [];
  let acc = 0;
  for (let i = 0; i < m; i++) {
    const mid = (acc + mins[i] / 2) / mt; acc += mins[i];
    let c = 0, k = 0;
    for (; k < e - 1; k++) { c += (share[k] || 0) / sh; if (mid < c - 1e-9) break; }
    k = Math.min(k, i, (out[i - 1] ?? 0) + (i ? 1 : 0)); // no se salta ninguna fase
    k = Math.max(k, m >= e ? e - m + i : 0);
    out.push(k);
  }
  for (let i = 0; i < lastK; i++) out.push(e);
  return out;
}

/** Texto corto «qué hacer» de una fase. */
export const phaseHow = (ph: Phase) => `${ph.label}: ${ph.text}`;
