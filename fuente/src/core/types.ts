export type WorkKind = 'task' | 'exam';
export type WorkStatus = 'pending' | 'in_progress' | 'done' | 'archived';
export type BlockStatus = 'planned' | 'done' | 'skipped' | 'rescheduled';
export interface Win { start: number; end: number } // minutos desde 00:00
export interface Settings {
  availability: Record<number, Win[]>; // 0=domingo … 6=sábado (ventanas de estudio permitidas)
  blockedDates: { date: string; start: number; end: number; pausa?: boolean }[]; // bloqueos puntuales
  maxDayMin: number; preferredMin: number; maxSessionMin: number;
  minSessionMin: number; minGapMin: number; horizonDays: number;
}
export interface Work {
  id: string; kind: WorkKind; subjectId: string; title: string;
  dueDate: string; dueMinute?: number; // fecha local YYYY-MM-DD
  estMin: number; difficulty: number; importance: number; readiness: number; // 1-5, 1-5, 0-100
  status: WorkStatus;
  // Estimador (opcionales: los datos antiguos no los tienen y siguen funcionando)
  learn?: Learn; goal?: Goal; size?: number; topics?: Topic[]; autoEst?: boolean;
  estimateV2?: EstimateV2; units?: { unit: string; total: number; done: number }; estimatorVersion?: 1 | 2; estimatorHistory?: { at: number; from: 1 | 2; to: 1 | 2; estimate: Estimate | null }[]; // ausente = 1
  /** Tarea SIN fecha límite: dueDate guarda el valor centinela NO_DATE (una app anterior lo trata como «muy lejos» y no falla). */
  noDate?: boolean; createdAt?: number;
  /** Opciones elegidas en el formulario (sin escribir nada): ritmo personal para esta tarea/examen y cantidad de materia del examen. */
  pace?: number; amount?: string;
  /** Tarea automática de repaso del temario (auto:'review') y estimación inicial sin ajuste aprendido (base0). */
  auto?: 'review'; topicRef?: string; base0?: number; felt?: -1 | 0 | 1;
  manualEstMin?: number; corrections?: { at: number; from: number | null; to: number }[]; estimate?: Estimate;
}
export interface Block {
  id: string; workId: string; date: string; start: number; end: number;
  status: BlockStatus; manual: boolean; quality?: 1 | 2 | 3; reason?: 'cansancio' | 'imprevisto' | 'nocabia' | 'otro'; part?: 'main' | 'review'; actualMin?: number; topicId?: string; log?: SessionLog;
}
export interface Now { date: string; minute: number } // hora local del usuario
export interface Warning { workId: string; type: 'deficit' | 'overdue'; deficitMin?: number; message: string }
export interface PlanResult { blocks: Block[]; created: string[]; removed: string[]; statusChanged: string[]; warnings: Warning[] }

export type Learn = 'comprension' | 'memorizacion' | 'ejercicios' | 'problemas' | 'comentario' | 'practica' | 'mixto';
export type Goal = 'aprobar' | 'notable' | 'excelente';
/** size/difficulty 1-5; mastery 0 (desde cero) … 3 (listo para repasar), continuo. */
export interface Topic {
  id: string; name: string; size: number; difficulty: number; mastery: number; explicit?: boolean; auto?: boolean;
  // v2 (opcionales). Extensión desconocida = `extent` ausente o count null: NUNCA se deduce de `size`.
  extent?: { unit: string; count: number | null }; evidence?: Attempt[]; selfRating?: number;
}
/** Intento de diagnóstico/recuperación. Solo `independent` cuenta como éxito independiente. */
export interface Attempt { at: string; items: number; independent: number; assisted: number; wrong: number; skipped: number; kind?: 'diagnostico' | 'recuperacion' | 'practica' }
export interface SessionLog { phase?: Phase; units?: number; items?: { n: number; independent: number; assisted: number; wrong: number; skipped: number }; valid?: boolean; actualMin: number; topicId?: string; progress: number; difficulty: number; goalMet: boolean; interrupted: boolean }
export interface Estimate {
  totalMin: number; investedMin: number; remainingMin: number; lowMin: number; highMin: number;
  learnMin: number; practiceMin: number; reviewMin: number; // desglose del trabajo RESTANTE
  perTopic: { id: string; name: string; remainingMin: number }[]; factors: string[];
  confidence: 'inicial' | 'personalizada'; provisional: boolean; calibration: { factor: number; n: number; level: string };
}

// ---------- Estimador 2.0: contrato (fase 1; implementación en fases 2-3) ----------
export type Phase = 'aprendizaje' | 'practica' | 'recuperacion' | 'errores' | 'repaso';
export type EvidenceLevel = 'ninguna' | 'baja' | 'media' | 'alta';
export interface PredictionRecord { id: string; workId: string; topicId?: string; phase: Phase | 'total'; at: string; predictedMin: number; p10: number; p90: number; modelVersion: string; baseMin?: number; observedMin?: number }
export interface EstimateV2 {
  modelVersion: string; totalMin: number; investedMin: number; remainingMin: number; phases: { phase: Phase; minutes: number }[];
  interval: { p10: number; p50: number; p90: number; kind: 'orientativo' | 'calibrado'; n: number };
  evidenceLevel: EvidenceLevel; confidence: 'muy baja' | 'baja' | 'media' | 'calibrada'; provisional: boolean; capped: boolean;
  perTopic?: { id: string; name: string; remainingMin: number; mastery: number; evidenceLevel: EvidenceLevel; unknownExtent: boolean }[]; factors?: string[];
  calibration?: { nEff: number; coverage: number | null; speedSamples: number }; unknownExtent?: boolean;
  viability?: { status: 'cabe con margen' | 'cabe sin margen' | 'no cabe' | 'espaciado insuficiente'; deficitP50?: number; deficitP90?: number };
}
export interface EstimateInputV2 {
  workId?: string; now?: string; kind: 'exam' | 'task'; learn: Learn; goal: Goal; family?: string; topics?: Topic[];
  task?: { difficulty: number; units?: { unit: string; total: number | null; done: number } };
  blocks: Block[]; predictions: PredictionRecord[]; config?: Partial<import('./config.ts').EstimatorConfig>;
  capacity?: { freeMin: number; freeDays: number }; manualMin?: number;
}

// ---------- Ejercicio físico y actividades opcionales (no son estudio: no entran en estimador ni evidencia) ----------
export interface Activity { id: string; category: 'exercise' | 'optional'; type: string; title?: string; date: string; start: number | null; end: number | null; durMin: number; status: 'planned' | 'done' | 'skipped'; actualMin?: number; note?: string; createdAt: number; updatedAt: number }
export interface SuggLog { id: string; date: string; kind: string; status: 'started' | 'done' | 'postponed' | 'dismissed' | 'replaced' | 'moved'; minutes?: number; until?: number; at: number }

// ---------- Rutina semanal habitual (bloques SUGERIDOS: no son obligaciones ni cuentan como tareas) ----------
export interface HabitBlock { id: string; date: string; start: number; end: number; subjectId: string; kind: 'estudio' | 'repaso'; title: string; detail: string; status: 'planned' | 'done' | 'skipped' | 'replaced' | 'displaced'; pinned: boolean; note?: string; actualMin?: number }
export interface FixedItem { id: string; name: string; days: number[]; start: number; end: number }
export interface Routine { enabled: boolean; intensity: 'ligero' | 'equilibrado' | 'exigente'; blockMin: number; perWeek: Record<string, number>; activeDays: number[]; fixed: FixedItem[]; lastTopic: Record<string, string>; quiet: { days: number[]; start: number; end: number }[]; generatedThrough: string | null }
