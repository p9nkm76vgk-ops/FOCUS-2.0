/** Método de estudio por asignatura, basado en la literatura (ver docs/METODO-ESTUDIO.md). Texto puro y determinista: no calcula nada, solo dice QUÉ hacer y POR QUÉ.
 *  Evidencia: Dunlosky et al. 2013; Adesope et al. 2017; Roediger & Karpicke 2006; Cepeda et al. 2008; Rohrer et al. 2020; Barbieri et al. 2023; Bisra et al. 2018; Graham & Perin 2007; Schroeder et al. 2018. */
export interface MethodTask { title: string; detail: string }
export interface SubjectMethod { tasks: MethodTask[]; repaso: MethodTask; why: string; evidence: 'alta' | 'media'; ideal: string }

export const METHOD: Record<string, SubjectMethod> = {
  'Matemáticas II': {
    tasks: [
      { title: 'Problemas mezclados sin mirar la solución', detail: 'Resuelve 4–6 problemas mezclados de Análisis, Álgebra/Geometría y Probabilidad. Antes de cada uno escribe qué método usarás y por qué. Comprueba al final y apunta los fallos en el cuaderno de errores.' },
      { title: 'Ejemplo resuelto y problema parecido', detail: 'Tema nuevo o flojo: estudia 1–2 ejemplos resueltos explicándote cada paso, tápalos y resuelve uno parecido y otro algo distinto sin ayuda.' },
      { title: 'Cuaderno de errores en frío', detail: 'Rehaz sin mirar la solución los fallos de hace 2–7 días. Si fallas, anota la causa (concepto, procedimiento, cálculo o lectura del enunciado).' }],
    repaso: { title: 'Fallos de la semana', detail: 'Rehaz en frío 2 problemas que fallaste y comprueba el método paso a paso.' },
    why: 'Mezclar tipos de problema (61 % vs 38 %, Rohrer 2020), ejemplos resueltos al empezar (g=0,48, Barbieri 2023) y recuperar en frío.', evidence: 'alta', ideal: '45–50 min' },
  'Física': {
    tasks: [
      { title: 'Problemas de los 4 bloques, principio primero', detail: 'Para cada problema escribe en 2 líneas qué ley o principio aplica y por qué; resuelve sin mirar la solución; comprueba unidades y orden de magnitud. Mezcla los cuatro bloques: en la PAU 2026 hay que hacerlos todos.' },
      { title: 'Ejemplo resuelto y autoexplicación', detail: 'Tema nuevo: estudia 2 ejemplos resueltos explicando cada paso, tápalos y resuelve uno parecido.' },
      { title: 'Leyes, unidades y relaciones de memoria', detail: 'Escribe sin mirar las leyes, fórmulas y unidades del bloque y compara con los apuntes; repite solo las falladas.' }],
    repaso: { title: 'Leyes y fórmulas de memoria', detail: 'Escribe sin mirar las leyes y relaciones del último bloque y comprueba cuáles se te escaparon.' },
    why: 'Autoexplicar cada paso (g=0,55, Bisra 2018) más recuperación e intercalado.', evidence: 'alta', ideal: '45–50 min' },
  'Química': {
    tasks: [
      { title: 'Test de formulación + problemas mezclados', detail: 'Test de 20 compuestos (10 nombre→fórmula, 10 fórmula→nombre, inorgánica y orgánica); repite los fallados hasta acertarlos. Después 2–3 problemas mezclados (estequiometría, equilibrio, ácido-base, redox).' },
      { title: 'Problemas intercalados sin mirar la solución', detail: 'Resuelve problemas de temas distintos mezclados; apunta los fallos en el cuaderno de errores.' },
      { title: 'Teoría explicada por escrito', detail: 'Explica por escrito, sin mirar, un apartado de teoría (enlace, Lewis, isomería…) y compara con los apuntes o los criterios PAU.' }],
    repaso: { title: 'Test de formulación', detail: '20 compuestos en ambos sentidos, sin mirar. Cada fórmula mal escrita en la PAU cuesta 0,5 puntos: repite las falladas hasta acertarlas.' },
    why: 'La formulación es memoria pura: recuperar y espaciar es lo que mejor funciona; los problemas, intercalados.', evidence: 'alta', ideal: '25 min formulación · 45–50 min problemas' },
  'Business': {
    tasks: [
      { title: 'Problemas numéricos + test de conceptos', detail: 'Resuelve 2 problemas mezclados (umbral de rentabilidad, VAN, ratios…) sin mirar la solución y contesta 10 preguntas tipo test de conceptos; revisa por qué falló cada error.' },
      { title: 'Conceptos de memoria con un ejemplo real', detail: 'Recupera sin apuntes los conceptos clave y ponles el ejemplo de una empresa conocida; pregúntate «¿por qué elegiría X en vez de Y?».' }],
    repaso: { title: 'Conceptos y fórmulas', detail: 'Tarjetas de definiciones y fórmulas del último tema, sin mirar; las falladas vuelven mañana.' },
    why: 'Conceptos por recuperación y procedimientos por ejemplos resueltos + intercalado.', evidence: 'media', ideal: '45 min' },
  'Lengua Castellana': {
    tasks: [
      { title: 'Redacción o comentario cronometrado', detail: '5 min planificar ideas y estructura, 30 escribir, 10 revisar con lista (adecuación, coherencia, cohesión, corrección). Compara después con los criterios de corrección.' },
      { title: 'Literatura de memoria', detail: 'Sin mirar: para 3 autores u obras escribe movimiento, época, características y una obra clave; comprueba.' },
      { title: 'Preguntas de lengua con corrección inmediata', detail: 'Ejercicios cortos de sintaxis, morfología y léxico de exámenes anteriores; corrige y explica cada error por escrito.' }],
    repaso: { title: 'Literatura de memoria', detail: 'Autor, obra, movimiento y rasgos del último tema, sin mirar; comprueba y repite lo fallado.' },
    why: 'Enseñar y usar estrategias de planificar y revisar es lo que más mejora la escritura (g=0,82, Graham y Perin 2007).', evidence: 'alta', ideal: '45–90 min' },
  'Catalán': {
    tasks: [
      { title: 'Reflexión lingüística con corrección', detail: '10 ejercicios de gramática y léxico de exámenes anteriores sin consultar; corrige y explica cada error por escrito (la reflexión lingüística vale 3 puntos).' },
      { title: 'Redacción cronometrada', detail: '5 min planificar, 30 escribir, 10 revisar con la lista de control; compara con los criterios de corrección.' },
      { title: 'Hecho literario de memoria', detail: 'Sin mirar: autor, obra, movimiento y rasgos de una obra del temario; comprueba.' }],
    repaso: { title: 'Gramática y léxico', detail: '10 preguntas cortas de gramática o léxico sin consultar; corrige y repite las falladas.' },
    why: 'Escritura con estrategia y práctica corregida; la gramática aislada no mejora la redacción, pero puntúa aparte.', evidence: 'alta', ideal: '45–90 min' },
  'Inglés': {
    tasks: [
      { title: 'Writing de 125–150 palabras en 25 min', detail: 'Redacción de un tema tipo PAU en tiempo de examen. Revisa gramática y conectores y reescribe las 3 frases peores.' },
      { title: 'Listening y reading tipo PAU', detail: 'Audio con preguntas de opción múltiple (los errores restan) y un texto con respuestas abiertas; corrige y anota el motivo del fallo.' },
      { title: 'Vocabulario pendiente', detail: 'Repasa sin mirar las tarjetas de hoy; las falladas vuelven mañana. No mezcles por categorías.' }],
    repaso: { title: 'Vocabulario pendiente', detail: 'Tarjetas de vocabulario y collocations de hoy, sin mirar; las falladas vuelven mañana.' },
    why: 'La redacción pesa un 40 % y mejora con práctica corregida; el vocabulario, con recuperación espaciada.', evidence: 'alta', ideal: '30–45 min' },
  'Historia de España': {
    tasks: [
      { title: 'Pregunta de desarrollo breve de memoria', detail: 'Responde de memoria 2 preguntas tipo PAU en 10–12 min cada una; compara con los apuntes y anota lo que te faltaba.' },
      { title: 'Línea de tiempo en blanco', detail: 'En una hoja en blanco reconstruye la línea de tiempo del periodo con fechas, hechos y causas; compárala con tu línea maestra y corrige en otro color.' },
      { title: 'Análisis de una fuente', detail: 'Texto, gráfico o mapa de un examen anterior: identifica, contextualiza y explica; corrige con los criterios.' }],
    repaso: { title: 'Repaso de Historia', detail: 'Línea de tiempo en blanco del último periodo o 5 preguntas de fechas, personajes y conceptos tipo test, sin mirar apuntes.' },
    why: 'Construir mapas y líneas de tiempo y luego reconstruirlos de memoria combina lo mejor de ambos (Schroeder 2018; Karpicke y Blunt 2011).', evidence: 'media', ideal: '25–45 min' },
  'Historia de la Filosofía': {
    tasks: [
      { title: 'Explicar la tesis de un autor por escrito', detail: 'Sin mirar, explica como a un compañero: problema, tesis, argumentos y conceptos clave del autor; compara con tu ficha y completa lo que faltaba.' },
      { title: 'Tabla comparativa entre autores', detail: 'Rellena de memoria la tabla de dos autores sobre un mismo problema (conocimiento, realidad, ética…); comprueba y escribe un párrafo de comparación.' },
      { title: 'Comentario de texto cronometrado', detail: 'Texto de un examen anterior: idea principal, justificación de la tesis y definición de términos; corrige con los criterios.' }],
    repaso: { title: 'Repaso de autores', detail: 'Tesis y conceptos clave de un autor reciente de memoria, y una línea que lo oponga a otro autor.' },
    why: 'Autoexplicar (g=0,55) y comparar autores parecidos rinde más que memorizar literalmente.', evidence: 'media', ideal: '30–45 min' },
};
export const GENERIC: SubjectMethod = {
  tasks: [{ title: 'Recuperar de memoria y comprobar', detail: 'Cierra los apuntes, escribe de memoria las ideas clave del último tema y corrige después en otro color.' },
    { title: 'Ejercicios sin mirar la solución', detail: 'Resuelve ejercicios del material que tengas y anota los fallos para repetirlos en frío.' }],
  repaso: { title: 'Repaso breve', detail: 'Recupera de memoria lo esencial sin mirar los apuntes y comprueba qué se te escapó.' },
  why: 'Recuperar de memoria y espaciar (Dunlosky 2013; Roediger y Karpicke 2006).', evidence: 'alta', ideal: '30–45 min' };
export const methodOf = (name?: string, key?: string): SubjectMethod => METHOD[key ?? ''] ?? METHOD[name ?? ''] ?? GENERIC;
/** Calendario de repasos por recuperación (Cepeda 2008): +1–2 días, +1 semana, +3 semanas y luego cada 3–5 semanas. */
export const SPACING = [2, 7, 21, 35] as const;
/** Línea corta de «qué hacer» para un bloque de obligación (tarea o examen). */
export const howFor = (name: string | undefined, key: string | undefined, o: { review?: boolean; exam?: boolean }): string => {
  const m = methodOf(name, key);
  if (o.review) return `${m.repaso.title}: ${m.repaso.detail}`;
  return `${m.tasks[0].title}: ${m.tasks[0].detail}`;
};
