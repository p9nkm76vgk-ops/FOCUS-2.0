# Focus OS · versión 5 (cambios sobre la 4)

## Qué cambia para ti
1. **Explorar eliminado.** Fuera del menú, de Hoy y del código. El *bienestar digital* (periodos sin notificaciones) sigue existiendo y ahora está en **Ajustes**. Tus datos antiguos de Explorar no se borran (siguen guardados y se exportan), solo dejan de usarse.
2. **Hasta 7 clases/bloques por semana por asignatura** (antes 4) en *Rutina semanal*. Como mucho uno al día. Si una asignatura necesita tantos bloques como días quedan en la semana, el planificador la coloca aunque toque dos días seguidos. Si pides más bloques de los que caben con la intensidad elegida, la pantalla te lo avisa con los números.
3. **Tareas y exámenes solo con botones.** Asignatura, fecha, tipo, tamaño, dificultad e importancia se eligen tocando. El nombre es opcional (se pone solo, p. ej. «Problemas de Física» o «Examen de Química»). Todo lo que antes había que escribir sigue disponible dentro de «Más opciones».
   - Tarea nueva: **Guardar y añadir otra** (conserva la asignatura) para volcar varias seguidas.
   - Examen: *cantidad de materia* (poca / normal / mucha / todo el trimestre), *cuánto lo llevas preparado*, dificultad, peso en la nota y objetivo. Si no escribes temas, se reparte en 1, 3, 5 u 8 partes iguales y la estimación se marca **aproximada**.
4. **Estimaciones mejoradas.**
   - Tamaño de tarea en minutos reales de referencia y no lineales (~15 min · ~30 min · ~1 h · ~2 h · ~4 h con dificultad normal), en lugar de «cantidad × 25 min».
   - Elección de **ritmo personal** por tarea o examen (voy rápido / normal / voy lento).
   - El tipo se deduce de la asignatura si no lo eliges (problemas, teoría, redacción…).
   - Se conserva el aprendizaje con tu historial real y la distinción entre estimación inicial y ajustada. **Los números base siguen siendo heurísticas, no ciencia**: se afinan con tus sesiones registradas.
5. **Tareas sin fecha.** Botón «Sin fecha». No son «para nunca»: se planifican en una ventana móvil de 14 días, compiten como si vencieran dentro de 6 días (después de lo urgente, antes de lo que vence más tarde), se reparten por los días menos cargados y **ganan prioridad cuanto más tiempo llevan esperando**. Si no caben, el aviso dice cuántos minutos faltan. Aparecen en Tareas en su propio apartado, ordenadas por importancia.
6. **Calendario más simple.** Solo dos tipos: **Obligatorio** (bloque relleno) y **Sugerido** (solo contorno). Sin etiquetas, rayados ni bordes discontinuos. En el calendario se toca un bloque para ver sus acciones (Hecho, Mover…); en «Hoy» las acciones siguen a la vista.
7. **Diseño nuevo.** Oscuro (carbón + dorado) por defecto; claro o «como el iPad» en Ajustes → Apariencia. Iconos de la app renovados.

## Compatibilidad y datos
- Mismo almacenamiento (`focusos.v1`); los cambios son aditivos. Las tareas sin fecha guardan una fecha lejana (`9999-12-31`) más la marca `noDate`, de modo que **la versión 4 abre esos datos sin error** (verificado con el archivo de la versión 4 incluido en las pruebas).
- La preferencia de apariencia se guarda aparte (`focusos.ui`) y no entra en la copia de datos.
- El tipo de asignatura que usa la preselección automática se deduce de los nombres iniciales y **no cambia** el estimador 2.0 de nadie.

## Qué se ha verificado (y qué no)
- **159/159 pruebas de Node** (unitarias y con DOM simulado).
- **Chromium real (no Safari):** 36 comprobaciones nuevas de esta versión (formularios por botones, sin fecha, examen por opciones, rutina de 5 por semana, menú de bloque, tema claro/oscuro, sin desbordamiento horizontal en 10 vistas × 2 temas, formularios en iPad vertical y móvil) + 57 flujos de la batería completa + emulación de GitHub Pages bajo `/focus-os/` (11/11, incluida la actualización del service worker sin tocar datos).
- **No verificado:** Safari/WebKit ni un iPad físico; la instalación como app en pantalla de inicio de esta versión; el aspecto real del color de la barra de estado del iPad.

## Para volver atrás
El historial de GitHub conserva la versión 4 (commit anterior). Tus datos no cambian de formato.

## Addendum: calendario con eje horario y avisos
- Calendario semanal reescrito: cada sesión ocupa su hora real en un eje (07:00–22:00 ampliable), con franja de estudio disponible, días bloqueados, línea de «ahora», carga planificada por día y cabecera fija al desplazarse. Cabe sin scroll horizontal en iPad apaisado y vertical (comprobado en Chromium, no en Safari).
- Tocar un hueco libre propone una sesión a esa hora; el pasado se rechaza.
- Aviso «No caben N min…»: ahora indica cuántos min/día más harían falta y se puede descartar con «Entendido» (reaparece solo si el déficit crece). Las tareas sin fecha ya no muestran ese aviso.
- Pruebas: 160 en Node, 39 comprobaciones en Chromium.

## v6: objetivo de nota, notas, temario, repaso espaciado, curso, revisión semanal
- **Objetivos y notas** (nuevo): objetivo de media, notas de 1.º, notas de 2.º (examen, tarea, evaluación), objetivo por asignatura, PAU esperada y nota de acceso (0,6·media + 0,4·PAU; sin ponderaciones). Proyección = media ponderada (examen 2, tarea 1, evaluación 3; las recientes +15 % por posición) diluida con la nota de 1.º (peso 2).
- **Planificador por brecha**: las horas de EXAMEN se multiplican por 1 + 0,1·brecha (acotado 0,9–1,3). Las tareas no cambian. Heurístico, ajustable en `goals.ts`.
- **Temario**: temas por asignatura con nivel (sin ver / visto / entendido / dominado). Al verlos se programan repasos a +2, 7, 21, 45 y 90 días como tareas automáticas (`auto:'review'`, id estable `rev:<tema>:<n>`, máx. 8 activas, idempotentes). Resultado del repaso: bien / regular / mal.
- **Ritmo aprendido**: con ≥3 trabajos terminados por asignatura, la estimación se ajusta (mediana de tiempo real / estimación inicial, encogida hacia 1, acotada 0,7–1,6). Se explica en los factores de la estimación y no toca minutos fijados a mano ni el estimador 2.0.
- **Calidad de sesión** (bien/regular/mal, opcional) → mejor franja horaria si hay ≥8 sesiones valoradas.
- **Curso hasta la PAU**: fases (cobertura / práctica / simulacros), capacidad semanal con 70 % de cumplimiento supuesto vs. horas heurísticas del temario restante.
- **Revisión semanal**: cumplimiento = min hechos / (hechos + omitidos); compara reparto real vs. brecha; botón para bajar el máximo diario.
- **Planificador**: evita dos sesiones de la misma asignatura pegadas cuando hay alternativa; las tareas fáciles (dificultad ≤2) buscan el último hueco del día.
- **Calendario**: vista de día; recordatorio semanal de copia de seguridad en Hoy.
- NO hecho: arrastrar sesiones con el dedo; sincronización en la nube. Pruebas: 186 en Node, 34 + 39 + 57 + 11 en Chromium. Sin Safari/iPad real.

## v6.1: el temario se arrastra de 1.º a 2.º
- Cada tema tiene curso (1.º o 2.º); el temario los agrupa y «Curso hasta la PAU» muestra cobertura por curso.
- Mantenimiento: todo tema visto exige repaso hasta la PAU. El coste semanal (25 min × 7 / intervalo actual) se descuenta de la capacidad para temario nuevo y se muestra el coste futuro con todo visto (intervalo de 90 días). Se cuentan los repasos atrasados.
- Altas en bloque escalonadas (3 temas por día) para no crear una avalancha de repasos.
- Pruebas: 188 en Node; Chromium 34 + 39 correctas.

## v6.2: solo la media de 1.º
- El formulario de objetivo pide una única nota media de 1.º (las asignaturas de 1.º no coinciden con las de 2.º). Es el punto de partida común de todas; cada asignatura la va sustituyendo con sus notas de 2.º (peso 2 frente a las notas). Los datos con notas de 1.º por asignatura siguen funcionando.

## v6.3: notas por evaluación con porcentaje; menú simplificado
- **Notas:** asignatura, evaluación (1.ª/2.ª/3.ª; la 3.ª es la nota final de 2.º), % que valía el examen dentro de su evaluación, nota y detalle opcional. No deja superar 100 % por evaluación y asignatura.
- **Cálculo:** ganado = Σ nota·%/100; «llevas» = ganado/% evaluado; «necesitas en el resto» = (objetivo − ganado)·100/% restante; si pasa de 10 → «No llegas (máx. X)». Ejemplo: 4 al 24 % con objetivo 9 → necesitas 10,58, máximo 8,56.
- **Media de 1.º:** solo para la nota de acceso (media de bachillerato = media de 1.º y 2.º); ya no se mezcla con las asignaturas. Quitados: brecha, tendencia y multiplicador de la pantalla (el reparto de horas por brecha sigue por dentro).
- **Quitado:** Revisión semanal y el grupo Asignaturas del menú (se gestionan en Ajustes). Las notas antiguas sin porcentaje se conservan y avisan, pero no cuentan.
- Pruebas: 189 en Node; Chromium 35 + 37 + 57 + 11.

## v7 — arreglos tras ver la app en el iPad + aprendizaje con tu feedback
- **Calendario**: alto mínimo legible (26 px); los bloques cortos van en una línea; los bloques que se solapan a la vista (p. ej. uno tachado y otro vigente) se reparten en carriles y los tachados van en gris.
- **Sin fragmentos**: el planificador ya no deja restos por debajo de la sesión mínima (60 min en ventanas de 50 → 35 + 25). Si no hay otra forma de colocarlo, usa el fragmento antes que perder capacidad.
- **«Hecha tal cual»**: un toque marca la sesión como hecha con los minutos previstos (sin formulario). «Con detalle» abre el formulario anterior. Está en Hoy, en las próximas sesiones y en el menú del calendario.
- **«No la haré»** + motivo (cansancio, imprevisto, no cabía, otro) y, para sesiones incumplidas de los últimos 3 días, Hoy pregunta qué pasó.
- **Aprende tus franjas**: sesiones cerradas (antes de hoy) hechas frente a omitidas por franja (<13, 13–17, 17–20, ≥20) y por día de la semana. Con ≥12 sesiones cerradas, y ≥4 en la franja, si fallas ≥50 % y ≥25 puntos por encima de tu media, las sesiones NUEVAS evitan esa franja/día cuando hay alternativa. Los «imprevistos» no cuentan. No toca sesiones ya planificadas. Visible en Seguimiento → «Lo que aprende el planificador».
- **Máximo diario sugerido** según las últimas 2 semanas (sube 30 min si cumples ≥90 % y llegas al tope ≥3 días; baja 30 si cumples <60 %); botón «Aplicar» o «Ahora no» (14 días).
- **«¿Tardaste más o menos?»** al completar una tarea con sesiones hechas: ajusta el ritmo aprendido (×0,8 / ×1 / ×1,25 sobre lo registrado).
- **Dominio del temario → horas de examen**: con ≥3 temas, factor 1,2 − 0,1·dominio medio (0,9–1,2), combinado con la brecha de nota (tope 0,85–1,4).
- **Repasos del temario** en su propia sección de Tareas (no en Estimaciones ni Prioridades). **Curso hasta la PAU** se marca «provisional» con <6 temas por asignatura y el texto de mantenimiento dice «bajará/subirá» según corresponda. **Seguimiento** muestra «pocos datos» con <5 sesiones cerradas. Copia de seguridad al final de Hoy con «Luego» (7 días). Aviso en Rutina si estudio + rutina superan el máximo diario + 1 h.
- Se mantiene a propósito que algún día supere el máximo (no es un error).
- Límites: verificado en Node (205 tests) y Chromium; sin probar en Safari/iPad por mi parte. Umbrales de aprendizaje son heurísticos.

## v8 — avisos en el Calendario, nota baja → temas, temporizador y semanas críticas
- **Avisos en el Calendario del iPad**: botón «Avisos en el Calendario» (vista Calendario) → descarga un `.ics` con tus sesiones futuras (aviso 10 min antes), exámenes (con hora: aviso 1 día antes; sin hora: día completo con aviso a las 9:00 del día anterior) y entregas. UID estable por evento (`<id>@focusos`): al reimportar, normalmente se actualizan los mismos eventos; los que quitas o mueves en la app hay que borrarlos a mano en el calendario. Horas «flotantes» (hora local del dispositivo). Sin servidor ni coste. No verificado en Apple Calendar real.
- **Nota baja → temas**: si una nota de los últimos 21 días queda por debajo de tu objetivo (7 si no lo hay) y la asignatura tiene temario, Hoy pregunta qué temas fallaste; los marcados vuelven a «Visto», sin repasos acumulados, con repaso mañana. Editar la nota no vuelve a preguntar.
- **Temporizador**: «▶ Empezar» (solo sesiones de hoy, una a la vez). Persiste al recargar o cerrar la app (se guarda la hora de inicio). «Terminar y guardar» registra los minutos reales (1–600) como «hecha»; «con detalle» abre el formulario con esos minutos; «Cancelar» no registra nada.
- **Semanas críticas**: tabla de las próximas 6 semanas en Exámenes (exámenes, entregas, estudio planificado o hecho) y aviso en Hoy si esta semana o la siguiente están «cargadas» (≥3 exámenes; ≥2 exámenes y ≥2 entregas; o carga ≥6 con examen=2, entrega=1). Ignora repasos, tareas sin fecha y terminadas.
- Corregido de la v7: «Luego» (copia) y «Ahora no» (máximo diario) se perdían al recargar.
- Tests: 216 en Node; Chromium 140 comprobaciones. Safari/iPad sin probar por mi parte.

## v8.1 — «No la haré» respeta tu hueco; pausa del plan; evolución de notas
- **«No la haré»**: la sesión pasa a omitida con motivo y su hueco queda reservado (en el planificador y en la rutina): no se vuelve a rellenar con estudio. El trabajo se recoloca en otro momento. Solo cuenta para sesiones de hoy en adelante; una sesión incumplida del pasado sin motivo sigue reprogramándose.
- **«Nunca a esta hora (día)»**: además recorta esa franja de tu disponibilidad para ese día de la semana (reversible en Ajustes → disponibilidad).
- **Pausar el plan** (Ajustes: 1, 2, 3 o 7 días; banner «Reanudar» en Hoy): bloquea los días completos; lo pendiente se recoloca después y nada se marca como incumplido.
- **Evolución por evaluación** en Notas y objetivo: tu media de cada evaluación (1.ª, 2.ª, 3.ª) por asignatura.
- Tests: 219 en Node; Chromium 140 comprobaciones.

## v8.2 — auditoría con simulación de 5 semanas
- Nuevo `scripts/simulacion.mjs` (`npm run sim`): 5 semanas de uso (4 exámenes, 7 tareas, 54 temas con repasos, el estudiante hace ≈70 % de las sesiones) y comprueba cada día: sin solapes, dentro de la disponibilidad, nada en el pasado, ids únicos, sin sesiones de trabajos terminados, idempotencia (recalcular dos veces no cambia nada), repasos acotados.
- Defecto real encontrado y corregido: **165 sesiones de 3–17 min** (restos tras conservar sesiones o tras avanzar). Ahora: un resto <20 min tras conservar sesiones se da por cubierto, un resto <10 min tras avanzar no se planifica, y el repaso final no se crea si queda <15 min. Resultado de la simulación: 1 sesión corta en 872 días-planificados.
- Consecuencia asumida: lo planificado puede quedar hasta 19 min por debajo de lo que falta en cada tramo (principal/repaso). Los tests lo comprueban con esa tolerancia.
- Validación: la preparación de un examen debe estar entre 0 y 3 (antes un valor fuera de rango producía estimaciones absurdas).

## v9 — patrón de planificación (organización del día)
**Reglas que sigue ahora el planificador al colocar cada sesión nueva** (orden de prioridad; implementadas en `plan()` / `fill()`):
1. No repetir el mismo trabajo el mismo día.
2. Evitar las franjas/días donde sueles fallar (si hay datos suficientes y otra opción).
3. La franja de después de cenar (desde las 20:30, `LATE_FROM`) solo como último recurso.
4. Los repasos del temario (cortos) se colocan después de lo grande y se **pegan a días que ya tienen estudio**; no abren un día por su cuenta.
5. Repartir por carga relativa (minutos del día / capacidad del día), no por minutos absolutos.
6. Sesiones **seguidas, sin huecos**: se prefiere la ventana adyacente a otra sesión del día.
7. Alternar asignaturas (penaliza dos sesiones de la misma asignatura juntas).
Además: lo difícil a primera hora de la ventana y lo fácil más tarde; sin restos <20 min; una sesión rechazada («No la haré») no se vuelve a rellenar.
- **Compactación** (días futuros, nunca hoy): si queda un hueco ≥15 min dentro de una ventana (porque una sesión se completó, se movió o dejó de hacer falta), las sesiones automáticas siguientes se adelantan para cerrarlo. Nunca toca manuales, hechas ni sesiones de hoy; es estable (recalcular no cambia nada).
- **«Regenerar futuro»** ahora de verdad regenera las sesiones automáticas que no han empezado (conserva historial, manuales, hechas y lo ya empezado). Al abrir esta versión por primera vez se regenera una sola vez (`patternV`).
- Medido con `npm run sim` (5 semanas, 70 % de cumplimiento): sesiones después de cenar 35 → 5, fragmentos <20 min 165 → 0, huecos >15 min dentro de una ventana 8 → 3 (los restantes son de hoy, que no se compacta a propósito), 4,3 → 5,5 bloques por día de estudio.
- Si tu «tiempo mínimo entre sesiones» en Ajustes es mayor de 10 min, los huecos serán de ese tamaño: el valor inicial es 10.

## v9.1 — Cena y ducha (20:30–22:00)
- Por defecto no se planifica estudio de 20:30 a 22:00 (`CENA` en el planificador; ventanas por defecto acaban a las 20:30).
- Instalaciones existentes: una sola vez (`cenaV`) se recorta esa franja de la disponibilidad. Lo que añadas después en Ajustes se respeta.
- Ajustes muestra una nota sobre la franja. Test nuevo en `v8.app.test.mjs`.
- Verificado: 224 tests Node, 140/140 comprobaciones Chromium, simulación sin sesiones tardías. Safari/iPad sin probar.

## v9.2 — «Regenerar futuro» borra la versión anterior por completo
- Antes quedaban en el calendario los bloques de rutina «sustituidos»/«sin hueco»/omitidos del plan anterior. Ahora el botón elimina todo lo futuro no hecho ni fijado (sesiones y rutina) y genera una versión limpia, sin solapes. Se conservan historial, hechas, fijadas y manuales.
- Test nuevo en `v8.app.test.mjs` (225 tests Node).
