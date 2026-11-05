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

## v10 — Método por asignatura, repaso de Historia y ejercicio fijo
- Cada bloque de rutina y cada bloque de obligación muestra «qué hacer» y, en la rutina, «por qué» (evidencia). Nueve asignaturas con tareas concretas (`method.ts`); pantalla nueva «Método de estudio» (Objetivos).
- Repasos cortos con propósito por asignatura: Historia de España («Repaso de Historia»), Filosofía («Repaso de autores»), Química (test de formulación), Inglés (vocabulario), etc. Ya no hay repasos genéricos.
- Ejercicio fijo 17:00–17:30 cada día: se corta de la disponibilidad (migración única `ejV`), se ve en el calendario y nunca recibe estudio. Se retira la sección «Ejercicio físico» y su sugerencia (los datos antiguos se conservan).
- Migración `metV`: se regenera una vez la planificación futura para adoptar los textos nuevos.
- Tests: 227 Node; Chromium 131 (v5 35, v6 35, final 50, pages 11; menos que antes porque se eliminaron las comprobaciones de la sección de ejercicio).

## v11 — Cuenta y sincronización móvil ↔ iPad
- Ajustes → «Cuenta y sincronización»: correo + contraseña (Supabase Auth). Una fila por usuario (`focus_state`) con RLS (cada usuario solo accede a la suya; `anon` sin permisos) y escritura con control de versión (`focus_push`), creadas por migración en el proyecto «Etudio».
- Instantánea completa: se sube tras cada cambio (con 2 s de espera) y se comprueba al abrir/volver a la app. Sin conexión funciona igual y se sube al volver. Si ambos dispositivos cambiaron, se pregunta (nube / este dispositivo / decidir luego) y la versión descartada queda en `focusos.v1.syncbackup`.
- Los tokens van en `focusos.sync`, aparte de los datos (no salen en exportaciones).
- Sin cuenta nada cambia: todo sigue local.
- Verificado: 232 tests Node (servidor falso en memoria), 4 comprobaciones de la tarjeta en Chromium (`browser-sync.py`), RLS/privilegios comprobados por consulta al catálogo. NO verificado: inicio de sesión y subida contra el Supabase real (la red del entorno no llega), aislamiento entre dos usuarios reales, ni Safari/iPad.
- Límites: ante edición simultánea sin conexión se elige una versión entera (no se fusionan campos). El correo de confirmación depende del proveedor de correo de Supabase (límite bajo de envíos en el plan gratuito).

## v11.1 — Reparto semanal justo en la rutina
- Con intensidad «equilibrada» (21 bloques/semana = 14 de estudio + 7 repasos) Matemáticas II acaparaba 2 estudios + 5 repasos y Historia de España, Filosofía, Inglés y Catalán solo 1 y ningún repaso: los desempates iban por orden de la lista. Ahora rotan por «la más antigua primero» contando lo ya planificado, los repasos van a la asignatura con menos bloques esa semana, y una cuota semanal mayor que la de las demás tiene prioridad.
- Resultado en una semana: cada asignatura 2–3 bloques, ninguna con más de 2 repasos. Test nuevo en `routine.test.ts` (233 tests). Migración `metV=2`: se regenera una vez el futuro.
- Chromium 135 (v5 35, v6 35, final 50, pages 11, sync 4).

## v12 — Planificación estable: obligaciones primero, rutina solo rellena (adiós tachados, diálogos y huecos)
Causas halladas y corregidas:
1. **«No hay tantos minutos… ajusta»:** la rutina ocupaba tiempo antes que las obligaciones y provocaba déficits y el diálogo «Cambios propuestos». Ahora las tareas y exámenes se planifican primero; la rutina se regenera con el tiempo que sobra. La rutina ya no puede causar déficit (comprobado en 6000 estados).
2. **Clase tachada + otra al lado:** el bloque de rutina se marcaba «sustituido» y la cuota semanal volvía a rellenar otra. Ya no existe «sustituido»/«sin hueco»: no se conserva nada tachado (los antiguos se ocultan y los futuros se eliminan al abrir), y las obligaciones de la semana cuentan para la cuota de esa asignatura.
3. **Huecos de 20–30 min:** la compactación se reduce a cerrar cualquier hueco ≥ 15 min (antes ≥ 25), también hoy para sesiones que empiezan dentro de más de 30 min; los bloques de rutina absorben restos pequeños (≤ 25 min) o se acortan (≥ 30 min) en vez de dejar hueco. Máximo hueco entre bloques de un mismo tramo: 24 min.
4. **Inestabilidad:** el planificador se repite hasta converger, así que repetir/regenerar no cambia nada.
- Se eliminan `reconcile`, `describe` y el diálogo de cambios; se conservan lo hecho, omitido, fijado y pasado.
- Nueva prueba de estrés `npm run estres` (150 secuencias aleatorias × 40 acciones, invariantes tras cada acción: sin tachados, sin solapes, dentro de disponibilidad, nunca en ejercicio/cena, estable, rutina sin déficit, sin huecos >24 min). Resultado: 6000 estados, 0 fallos.
- Tests: 233 Node; Chromium 136 (v5 35, v6 35, final 51, pages 11, sync 4).

## v13 (20 oct 2026)
- Exámenes a ≤ 14 días se planifican SIEMPRE antes que las entregas (`EXAM_FIRST_DAYS`); una entrega solo usa lo que el examen deja libre.
- Sin avisos de déficit en Hoy; lo que no cabe se recoloca por prioridad (los exámenes ganan). Sesiones no registradas se reprograman solas al abrir/pasar el tiempo.
- Cronómetro: `Block.running` protege la sesión; pasada la hora sigue contando («llevas N min de más»).
- Fase «comprender antes de practicar» (examen con preparación < 60 %: ~30 % de sesiones) y tarjeta «¿Te está funcionando?» con tus datos reales.
- `src/app/fotos.js` (tarjeta «Mi porqué», fotos solo en el dispositivo) existe pero NO está en la compilación: sin verificar.

## v13.1 (20 oct 2026, tarde)
- Protección de examen (`examGuard`, `EXAM_GUARD_DAYS`=3, `GUARD_MIN_PER_DAY`=90): los 3 días previos solo se estudia la asignatura del examen (planificador y rutina); las entregas de otras asignaturas esperan salvo que venzan ese día.
- Horario de clases en Ajustes (`S.timetable`) y `.ics` con evento semanal recurrente + aviso 10 min antes por clase (hasta el 15 de junio). Arreglado el escape de `;` en el `.ics`.
- Hoy rediseñado (`src/app/hoy2.js`): tarjeta de la sesión actual con ✓ Hecho / No hecho a un toque; lista del día; exámenes cercanos; el resto plegado (estado recordado). Rutina: configuración plegada. Calendario: rejilla y bloques más suaves.
- Sin toast de migración del ejercicio.

## v13.2 (20 oct 2026)
- Tareas y Exámenes: filas agrupadas (Atrasadas · Hoy · Mañana · Esta semana · Más adelante), cuenta atrás en exámenes, terminadas/repasos plegados.
- Calendario: barra limpia, resto en «Más acciones». Rutina: configuración plegada. Plegables recuerdan su estado.
- Nueva tarea: solo asignatura, fecha y título (opcional); tipo, tamaño, dificultad e importancia en «Más opciones».

## v14 (20 oct 2026, noche)
- Cuaderno de errores (`src/core/errores.ts`): «+ Fallo» o campo en el registro detallado; vuelve a 2 días, 1, 3 y 5 semanas; fallar → mañana; responder 2 veces el mismo día no avanza dos etapas. En Hoy: «Rehacer hoy» (máx. 3).
- Semana de examen: examen de peso ≥ 4 protege 5 días (3 si pesa menos); el repaso final del examen es un «Simulacro cronometrado».
- Resumen semanal (`src/core/semana.ts`): domingo (semana en curso) y lunes (la anterior); cumplimiento con la fórmula de estadísticas; ajuste «un bloque más» a la asignatura más floja (si la rutina está activa).
- Diseño: horario de clases plegado en Ajustes; registro detallado con lo esencial arriba; fórmula de cumplimiento plegada.

## v15 — fases por asignatura, método editable, autopsia del examen
- **Fases secuenciales** (`src/core/fases.ts`): guion (Filosofía, Historia, Lengua, Catalán) 35/50/15 = escribir → memorizar → prueba en frío; Business 100 % memorizar o 70/30 con cálculo (campo «¿Lleva cálculo?» del examen); Inglés 25/75; Física y Química 25/75; Mates 10/90. La última fase recibe siempre ≥ 2 sesiones (o su porcentaje). Las instrucciones ya no llevan cantidades fijas. Los repartos son hipótesis, no valores medidos.
- **Método editable**: nombre, porcentaje y texto de cada fase por asignatura (`S.methodCfg`, se sincroniza); valida suma 100; «Restaurar».
- **Autopsia** (`src/core/autopsia.ts`, `S.autopsies`): el día del examen desde las 14:30 (o hasta 7 días después) aparece en Hoy; causas, tiempo, temas flojos (al cuaderno de errores), qué ayudó, y en asignaturas de guion si usaste el método y cuántos comentarios practicaste. Una por examen (guardar de nuevo no duplica). Resumen por reglas en Método con ajustes que solo se aplican al confirmar (causa en ≥ 2 autopsias y ≥ 50 %).
- **Confianza previa** (1–5) el día antes (`Work.confidence`), comparada con la nota real cuando hay ≥ 3 exámenes.
- **Guion por tema** en Temario (sin guion → escrito → memorizado → dominado) en asignaturas de guion.
- Pendiente: revisar visualmente Temario con datos (la captura de prueba no cargó temas), probar en Safari/iPad.

## v16 — diseño: navegación, búsqueda, calendario compacto
- **Menú plano**: los 12 destinos a un toque (Hoy, Calendario, Tareas, Exámenes · Estudio · Más), sin grupos desplegables.
- **Búsqueda global** (botón, tecla «/» o Ctrl/⌘+K): pantallas, acciones, asignaturas, tareas, exámenes y temas; sin acentos ni mayúsculas, Intro abre la primera coincidencia, Esc cierra.
- **Barra de pestañas inferior** en iPad vertical y móvil (Hoy · Calendario · Tareas · Exámenes · Más) y lupa en la barra superior.
- **Barras de saltos** (chips fijos arriba) en Ajustes, Método y Temario.
- **Calendario**: rango horario ajustado a lo que hay (antes siempre 07:00–22:30), 17 % menos alto por hora y nombres abreviados en la vista semanal (el nombre completo sigue en el aria-label y en la vista de día).
- **Hoy**: barra de progreso del día (minutos hechos/planificados) y tira de la semana (planificado frente a completado por día).
- Pendiente: Safari/iPad real; revisión visual de Tareas, Rutina y Progreso tras estos cambios (solo se revisaron Hoy, Calendario, Ajustes, buscador, Método).

## v17 — sistema visual y colores
- **Paleta de asignaturas rediseñada con medición**: la diferencia de color mínima entre dos asignaturas (ΔE76) pasó de ≈ 18 (Química/Inglés casi iguales) a ≈ 40, manteniendo contraste ≥ 4,5:1 sobre el carbón y ≥ 3:1 sobre blanco (exigencia del propio proyecto). Los tonos se eligieron con una búsqueda numérica sobre la rueda de color; no es una norma, es una optimización de esas dos restricciones. El nombre siempre va junto al color.
- **Tokens v17**: carbón cálido en capas (fondo #111113 → tarjetas → superficies elevadas), oro con degradado, colores semánticos (ok, aviso, info). Tema claro con las mismas capas.
- **Detalles**: tarjetas con luz superior y sombra, botón primario con degradado, menú con barra de acento y brillo en la sección activa, marca con gema dorada, héroe de Hoy con resplandor del color de la asignatura, bloques del calendario tintados, diálogos con desenfoque de fondo, entrada suave de pantallas (desactivada con «reducir movimiento»).
- Pendiente: Safari/iPad real (el desenfoque y los degradados solo se vieron en Chromium); revisar visualmente Progreso, Rutina y Temario con datos.

## v18 — Progreso, estados vacíos, temporizador
- **Progreso** rehecho: anillo de cumplimiento (fórmula sin cambios: minutos hechos ÷ hechos + omitidos; reprogramadas fuera), esta semana, racha (días seguidos con alguna sesión hecha, contando desde ayer si hoy aún no hay), total, últimos 7 días, evolución de 6 semanas con el cumplimiento de cada una y reparto por asignatura con su cumplimiento. Se conservan «Cómo se calcula», la rutina y «Lo que aprende el planificador». Sin datos: estado vacío, nada inventado.
- **Estados vacíos** con acción en Tareas, Exámenes y Progreso.
- **Temporizador**: tarjeta con anillo de progreso, fase y «Qué hacer»; **modo concentración** a pantalla completa (reloj hh:mm:ss, barra, instrucción; Esc o ✕ sale, el contador sigue; «Terminar y guardar» cierra la sesión).
- Menú: «Progreso y estadísticas» pasa a «Progreso».
- Pendiente: Safari/iPad real (pantalla completa y wake lock no verificados); gestos de deslizar sobre sesiones (no hechos).

## v19
- Rutina semanal: los próximos 7 días en tarjetas por día con total de horas (hoy resaltado). Se oculta la etiqueta «Obligatorio» repetida.
- Objetivos y notas: sin objetivo ni notas ya no se pinta la tabla vacía de guiones.
- Curso hasta la PAU: estado vacío destacado.
- Verificado: npm test 276/276; Chromium v16 20/20, final 51/51. Pendiente: Safari/iPad real; Temario con temas (fixture sin temario).

## v19.1
- Hecho / No hecho y tarjeta «Siguiente»: restaurados color y luz anteriores a v17 (botón dorado plano #d9ad52 sin brillo, tarjeta sin resplandor lateral, mismo tamaño de título).

## v19.2
- Paleta de asignaturas: vuelve la apagada de antes (la saturada de v17 se ve mal). Test y scripts Chromium actualizados.
- Hoy: las filas de sesión ya no llevan Hecho/No hecho (ocupaban media fila); se toca la fila y se abre el menú (Hecho, Mover, No la haré…). La tarjeta «Siguiente» conserva Hecho / No hecho. Más separación entre botones.
- Verificado: npm test 276/276; Chromium v16 20/20, v18 12/12, final 51/51.

## v20
- Horas realmente estudiadas por examen (solo sesiones hechas; si hay tiempo real, ese): en la lista de Exámenes («2h20 estudiadas»), en Hoy la mañana del examen («Te has preparado 2h20 en 2 sesiones · te quedan … previstas») y al acabar, junto a «¿Qué tal ha ido?» y «¿Qué nota sacaste?».
- Omitidas, reprogramadas y previstas no cuentan como estudiadas. Test v20.

## v20.1
- Exámenes ya pasados salen solos de la lista principal al grupo plegado «Pasados y archivados». Cada uno tiene «Quitar»: Archivar (conserva horas y nota) o Eliminar del todo (borra examen y sesiones; conserva la nota apuntada). Antes no se podía eliminar un examen con sesiones hechas.

## v20.2
- Actualización automática: cuando se instala una versión nueva, la app se recarga sola (si no hay un formulario abierto) y comprueba actualizaciones al abrir. Los datos no se tocan. La primera vez desde una versión antigua hay que cerrar y abrir la app dos veces.

## v20.3 — semana de exámenes
- Causa: cuando las horas no alcanzaban para todos los exámenes, el planificador llenaba el más cercano hasta el final y los demás se quedaban SIN ninguna hora (con 9 exámenes en una semana solo 3–4 asignaturas recibían estudio).
- Arreglo: reparto por niveles (water-filling). Si la necesidad total supera el 90 % de la capacidad hasta el último examen, cada examen recibe como máximo el mismo nivel de horas y el sobrante va a los más urgentes. Función pura de los datos → estable al repetir. Si todo cabe, no cambia nada.
- Verificado: npm test 279/279, estrés 6000 estados 0 fallos, test v20 (9 exámenes: todas las asignaturas ≥ 60 min y regenerar dos veces no cambia).

## v21
- Refuerzo de exámenes (Ajustes): horas extra con fecha, 06:00–07:00 y 22:00–23:00, hasta el día elegido (por defecto 2 semanas desde la primera apertura con datos). Suben el tope diario en lo que suman. El planificador las usa solo si hace falta; no cambian el horario normal. Se pueden quitar o cambiar en Ajustes → Refuerzo de exámenes.
- Hoy más sencillo: se quita la tira semanal (barras sin etiqueta). El resto sigue igual.
- Calendario: con refuerzo el día va de 06:00 a 23:00 (más alto).
- Verificado: npm test 280/280, estrés 6000/0, Chromium v16 20/20, v18 12/12, final 51/51.

## v22 — plan de admisión (documento de ingeniería Madrid)
- Al abrir datos existentes con exámenes y SIN objetivos propios, se aplica una vez: media de 1.º 9,11, objetivo de 2.º 9,3, PAU 1 jun 2027, acceso esperado 8,5, objetivo de admisión 12,41 (GITI UPM, corte 12,261 + 0,15). Si ya hay objetivos propios no se toca nada.
- «Notas y objetivo»: tarjeta «Tu objetivo de admisión» con la media que necesitas en Matemáticas II y Física/Química y «Dónde rinde más estudiar» (puntos de admisión por punto de nota; aproximado).
- Horas de examen: factor heurístico por valor (Mates ×1,15, Física/Química ×1,08, Business/Hª España ×0,92) dentro del tope existente (0,85–1,4).
- Cifras tomadas del documento tal cual (no verificadas por mí). Fórmula: 0,6·media Bach. + 0,4·media acceso + 0,2·M1 + 0,2·M2.
- Verificado: npm test 282/282, estrés 6000/0, Chromium v16/v18/final/v13.

## v23 — Fines de semana activos y «Cómo llegarás a cada examen»
- Fines de semana: ventanas 08:00–13:30, 15:00–17:00, 17:30–20:30 (levantarse a las 8), tope 7 h/día (`maxDayWeekend`). Migración única solo si las ventanas eran las antiguas por defecto.
- El refuerzo de mañana (06–07) solo aplica de lunes a viernes; el de noche (22–23), todos los días.
- Exámenes: tarjeta «Cómo llegarás a cada examen» (horas hechas + previstas frente a la estimación; etiquetas Plan completo / Llegas justo / Te quedas corto).
- Pruebas ejecutadas: npm test, estrés (6000 estados, 0 fallos), Chromium v16/v18/final/v13/pages. Safari/iPad sin probar.

## v23.1 — Prioridades personales por asignatura
- Más horas a Catalán e Historia de España (a nivel de Lengua, factor 1,06); menos a Inglés, Business y Filosofía (0,88). Matemáticas/Física/Química siguen arriba. Tabla `PERSONAL` en goals.ts, fácil de editar.

## v23.2 — Inglés al mínimo
- Inglés factor 0,55 (≈4–5 h por examen); Lengua 1,12, Business y Filosofía 1,0. Suelo del factor de horas bajado de 0,85 a 0,5.

## v23.3 — Nivel actual por asignatura y «Horas hasta cada examen»
- Cada asignatura tiene «Nivel actual» (0 de cero · 1 algo sé · 2 bastante bien · 3 muy preparado). Es el valor por defecto de «Preparación» en exámenes nuevos. Migración única (`nivV`): niveles iniciales según el usuario (Mates 1, Física 0, Química 2, Business 1, Lengua 0, Catalán 0, Inglés 2, Hª España 0, Filosofía 2) aplicados solo a exámenes con temas automáticos a 0.
- La tarjeta pasa a «Horas hasta cada examen»: hechas y previstas, sin etiquetas «te quedas corto» ni %. Inglés factor 0,8.

## v24 — Semana de exámenes
- Semana (lunes–viernes) con 3 o más exámenes con fecha: salida a las 12:50 → ventanas extra 06:30–08:30 y desde las 13:30 hasta donde empieza el horario normal (marcadas `ex:1`). Se calculan en cada plan (`examWeekWins`, finde.js); no se guardan.
- Víspera: el repaso final del examen de mañana pesa más en semana de exámenes (hasta 60 % del trabajo) y se coloca de preferencia el día anterior (`VISPERA_MIN` = 180 min), solo si no hay exceso de carga.
- Planificador: el reparto equitativo entre exámenes ahora respeta cada fecha límite (un examen no usa capacidad de días posteriores; 80 % de la capacidad por fecha); con exceso de carga, los plazos cercanos ocupan primero los primeros días. Corregido un bucle infinito latente en la búsqueda del nivel.
- Pruebas: 286 tests, estrés 6000 estados 0 fallos, Chromium v16/v18/final/v13/pages. Safari/iPad sin probar.

## v25 — Sin estudio fuera de horario salvo en la semana de exámenes
- Migración única (`refV`): el refuerzo 06–07 / 22–23 queda apagado (se puede reactivar en Ajustes). Fuera de la semana de exámenes no se estudia antes de las 7:00 ni después de las 20:30.
- Semana previa a la de exámenes: miércoles a viernes desde las 14:45 (`preWeekWins`) para repasar algo más; la semana de exámenes mantiene 06:30–08:30 y tarde desde las 13:30.

## v26 — Pausa de entrenamiento entre semana
- `S.pausaEntreno` (migración única `trV`: activada). Hasta el último examen, de lunes a viernes el hueco de ejercicio (17:00–17:30) pasa a ser estudio (`trainWins`) y el bloque fijo «Ejercicio» deja de mostrarse. Sábado y domingo se reserva 1 h (17:00–18:00) como actividad de ejercicio, creada una sola vez por fecha (`entrenoHecho`; si la borras, no vuelve).
- Ajustes → «Entrenar entre semana» para pausar o reanudar.

## v27 — Regenerar sin sorpresas y «lo llevo yo»
- «Regenerar futuro» ya no toca lo que queda de hoy (se regenera de mañana en adelante) y guarda una copia (`S.deshacer`): botón «Deshacer última regeneración» en Calendario, visible el mismo día.
- Examen con «Sesiones automáticas: No, lo llevo yo» (`noPlan`): sin sesiones ni repasos del temario de esa asignatura mientras esté pendiente (`planWorks`). Migración única (`fiV`): el examen de Filosofía de hoy o mañana queda así.

## v29 — Plan siempre al día (integra v28 de entreno diario, publicado por separado)
- Horizonte de planificación 28 → 120 días (migración única `hzV` solo si seguía en ≤ 28).
- Cada cambio (y cada apertura de la app) rehace de mañana en adelante las sesiones automáticas (`autoRegen` en `commit`); lo de hoy, lo hecho y lo manual no se tocan. Es determinista, así que repetirlo no cambia nada. Se quita el botón «Regenerar futuro» (y el de deshacer, que ya no hace falta).
- Reparto equitativo entre exámenes: se recorta por fecha límite creciente y solo a los exámenes que vencen hasta una fecha que no cabe; los exámenes lejanos conservan sus horas.
- `browser-final.py`: la estabilidad se comprueba llamando a `commit()` dos veces.

## v30 — Temario único con colores (Rojo / Naranja / Verde / Oro)
- Una sola lista de temas por asignatura (`Temario`). Niveles: Rojo (no sabría hacerlo), Naranja (a medias), Verde (me sale bien), Oro (perfecto y rápido). Sustituye «Sin ver / Visto…».
- Los temas de un examen salen del temario; el color decide las horas; las sesiones se asignan a temas y al registrarlas se actualiza el nivel; repasos espaciados (2/7/21/45/90 días) para N/V/O; un tema fallado vuelve a Rojo.
- «+ Temas»: pegar varias líneas `R/N/V/O Nombre`; un `*` final = entra en el próximo examen.
- Migración única (`tmV`) que carga los temas indicados por el usuario en Rojo y los enlaza a los exámenes de noviembre.
- Pruebas: npm test 295/295, estrés 6000 estados 0 fallos, Chromium v16/v18/final/v13/pages OK. Pendiente: Safari/iPad real.

## v30.1 / v31
- v30.1: temas de Business (Tema 1, Unidad 2, Tema 5 «solo problemas») añadidos al temario (migración `tmV` 2).
- v31: objetivo declarado: admisión 12,5 mínimo (ideal 12,75), media 9,1, acceso 8,5, mínimo 9 en Matemáticas II y Business (migración única `obV`). La tarjeta muestra la media necesaria en las dos materias ponderables para el mínimo y para el ideal.

## v32 — Tres colores y reparto por rondas
- Niveles del temario: Rojo (llego sin saber nada) · Amarillo (llego y me defiendo) · Verde (preparado). Se elimina Oro. Internamente 0/1/3 (el 2 antiguo se trata como Verde; migración `tmV` 3: Verde(2)→Verde(3); Naranja→Amarillo). Verde = dominio 100 %, así que un tema en verde no pide más horas ni baja el porcentaje de dominio. Repaso «Bien» → Verde; «Mal» → Amarillo.
- Planificador: dentro de cada nivel de prioridad, las demandas colocan una sesión por ronda (ya no se llena un examen entero antes de empezar el siguiente), y con exceso de carga cada examen prefiere el último 60 % de su ventana. Evita que el último examen se quede con los huecos de la víspera. Determinista e idempotente (test).

## v33 — Eliminar exámenes/tareas desde el formulario
- Antes: si el trabajo tenía sesiones completadas, «Eliminar» tras el confirm devolvía un aviso escondido al final del formulario y no borraba nada. Ahora «Eliminar» abre una pantalla propia (sin confirm nativo): con horas estudiadas ofrece Archivar (conserva horas y nota) o Eliminar del todo; sin horas, Eliminar. Siempre borra sus sesiones y el plan se recalcula.

## v34 — Semanas de exámenes del 2.º y 3.er trimestre
- Exámenes PROVISIONALES copiados de la semana del 1.er trimestre (9–13 nov 2026), cada uno el mismo día de la semana: 2.º trimestre mié 3–mar 9 feb 2027 (lun→8, mar→9, mié→3, jue→4, vie→5); 3.º vie 7–jue 13 may 2027 (vie→7, lun→10, mar→11, mié→12, jue→13). Migración única `triV`; ids estables `tri<n>:<id origen>`. No copia «lo llevo yo» (noPlan).
- `planFrom`: el 2.º se planifica desde el 14 nov 2026; el 3.º desde el 10 feb 2027 y solo cuando entra en el horizonte (120 días). No alargan la pausa de entreno.
- Semana de exámenes = racha de días con ≥3 exámenes y huecos ≤3 días (ya no «lunes–viernes de cualquier semana con ≥3»): las ventanas de mañana/tarde solo caen en días con examen, nunca en fines de semana.
- Planificador: los exámenes lejanos (ventana ≥21 días) reparten sus sesiones por toda la ventana (antes: sesiones consecutivas desde hoy); los lejanos tampoco se amontonan en los primeros días cuando hay exceso de carga.

## v35 — Provisionales por orden de día lectivo (corrige v34)
- v34 los colocaba por día de la semana (lunes→lunes). Como las semanas nuevas no son lunes–viernes (3–9 feb = mié–mar; 7–13 may = vie–jue), ahora cada día de exámenes de noviembre va al día lectivo del mismo lugar: 2.º trim. mié 3, jue 4, vie 5, lun 8, mar 9; 3.er trim. vie 7, lun 10, mar 11, mié 12, jue 13. Migración `triV` 2: rehace los provisionales de v34 que no se hayan editado.

## v36 — Todo fijado por la app
- Quitados: «Rutina semanal» (página, menú, tarjeta en Hoy, búsqueda), «Tiempo libre · sugerencias», los bloques «Sugerido», las etiquetas «Obligatorio/Sugerido» del calendario, «+ Sesión» (Hoy y Calendario), «Nueva sesión» en el buscador y tocar un hueco del calendario para fijar una asignatura. Migración `rtV`: apaga la rutina y borra los bloques de rutina futuros no hechos (se conservan los hechos para las estadísticas). «Mover» y «No la haré» de una sesión existente siguen disponibles.

## v37 — Planificador: reparto con rendimientos decrecientes y reserva de capacidad
- Recorte por plazo (cuando no cabe todo): cada examen recibe min(necesidad, λ·necesidad^0,5) (`TRIM_GAMMA`). Quien tiene más trabajo (temas en rojo) recibe más horas, pero no a costa de dejar a cero a los exámenes pequeños.
- Guardia de viabilidad (condición de Hall) en el reparto por rondas: primero se colocan solo sesiones que no impiden cubrir los plazos anteriores; después, sin guardia.
- Auditoría `node --no-warnings scripts/audit-plan.mjs` (escenarios hipotéticos): sesiones en la víspera máx. 62 % → 41 %; cobertura mínima 0,44 → 0,45–0,47; media 0,90.
- Pruebas ejecutadas: npm test 303/303; estrés 6000 estados, 0 fallos. Pendientes: Safari/iPad real; los escenarios son hipotéticos, no tus datos.

## v38 — Una sesión cada día hasta la PAU, proyección de horas y Business optativa (0,2)
- **Estudio diario:** cada día entre hoy y la fecha de la PAU que no tenga estudio recibe una sesión de 45 min (`DAILY_MIN`) de la asignatura que toca (reparto ponderado por valor para la nota × lo que falta por dominar; el tema sale del temario, de menos a más dominado). Paso 3c del planificador: va DESPUÉS de exámenes y tareas, por lo que nunca les quita sitio; si el día se llena con trabajo real, el relleno desaparece solo, y si ese trabajo se completa o se borra, vuelve. Respeta bloqueos, cena, ejercicio, protección de examen (días previos solo esa asignatura; el día del examen, antes de él o ≥ 3 h después, y de otra asignatura) y los días en que dijiste que no harías la sesión. Una sesión de relleno incumplida se cierra como omitida (no «reprogramada»). Conserva las sesiones de relleno aún válidas (estable) y es idempotente.
- Trabajos ocultos `daily:<asignatura>` (`auto:'review'`, `daily:true`): no salen en Tareas, Asignaturas, Estimaciones ni búsqueda. Se pueden quitar con un botón (Curso hasta la PAU).
- **Proyección de horas** (Curso hasta la PAU): horas hechas + previstas hasta la PAU, por mes y por asignatura, calculada sobre una copia con horizonte hasta la PAU (no cambia tu plan).
- **Business** pondera 0,2 como optativa: valor 0,23 (como Física/Química) y factor de horas 1,08; textos del plan de admisión actualizados.
- Pruebas ejecutadas: `npm test` 308/308 (5 nuevas en `test/v38.app.test.mjs`), estrés 6000 estados 0 fallos, Chromium 42/42. Pendiente: Safari/iPad real.

## v39 — Progreso 2.0 (panel de análisis con gráficos propios)
- Pantalla Progreso rehecha con SVG propio (sin librerías): selector Semana / Mes / 3 meses / Curso; tarjeta «Camino a la semana de exámenes» (días, temario rojo/amarillo/verde, estudio previsto, entreno); horas con variación frente al periodo anterior y anillo hecho/planificado; barras hecho vs planificado con media; racha (actual y mejor); semana en curso; tendencia de 12 semanas con media móvil; reparto por asignatura (donut); mapa de constancia de 14 semanas; mejor día y franja; dominio del temario por asignatura; preparación de los próximos exámenes; notas frente a objetivo; entrenamiento de 14 días; «Lo que aprende el planificador» se conserva.
- Todo sale de bloques, temario, notas y actividades persistidos; sin datos muestra estado vacío (sin ejemplos). Planificado futuro no se mezcla con lo hecho (las barras se cortan en hoy).
- Pruebas: npm test 310/310 (2 nuevas de Progreso; 4 antiguas adaptadas al nuevo diseño), estrés 6000 estados 0 fallos, Chromium 42/42. Capturas revisadas en iPad y móvil con datos de prueba (no reales). Pendiente: Safari/iPad real.

## v40 · Sistema visual de toda la app
- Fondo con brillos ambientales, tarjetas de cristal, botones en píldora, botón principal dorado con degradado, sidebar de cristal y barra de pestañas flotante en móvil/iPad.
- Hoy: cabecera con saludo y anillo de progreso, tres KPI (sesiones, racha, semana), accesos rápidos con icono, tarjeta «Siguiente» destacada y exámenes con anillo de preparación.
- Exámenes: tarjetas con anillo, cuenta atrás y barra de horas hechas/previstas (los 6 próximos); el resto sigue en la lista. Se corrigió un HTML mal anidado de la tarjeta anterior.
- Calendario semanal: bloques más limpios (sin subtítulo; hábitos atenuados).
- Sin cambios en el planificador ni en los datos. Tests 310/310, estrés 6000/0, Chromium 42/42. Safari/iPad real sin probar; capturas con datos sintéticos.

## v41 · Paleta y estilo «Helios»
Negro casi puro en tarjetas y sidebar, fondo con resplandor ciruela, acento lila rosado (#e6bde1), botón principal en píldora lila, navegación activa ciruela oscuro (#2e212d), títulos en peso ligero, bordes finos translúcidos. Sustituye al dorado. Tests 310/310, Chromium 42/42; sin probar en Safari/iPad real.

## v41b · Hoy como panel (bento)
Barra superior (Tarea/Examen/Fallo + buscador), tres cifras, tarjeta «Siguiente», tarjeta de horas con selector 7 d/30 d/3 m/Curso y gráfica, lista de próximos exámenes con % de preparación y 4 asignaturas de la semana. Dos columnas en pantallas ≥1200 px; una columna en iPad vertical y móvil. Tests 310/310, Chromium 42/42.

## v42 · Maqueta de 10 pantallas (ChatGPT) aplicada
Hoy en tres filas (anillo+cifras+accesos | siguiente sesión; resto del día | horas con selector; próximos exámenes con barra | asignaturas de la semana). Tareas con filtros Todas/Hoy/Esta semana/Atrasadas. Exámenes con tres cifras (preparación media, días al próximo, total). Asignaturas en teselas de color. Pendiente: panel de próximos exámenes en Calendario, Curso hasta la PAU y Notas con el diseño de la maqueta. Tests 310/310.

## v43 · Gráficas interactivas, Curso con cabecera, Calendario con panel
Gráficas (línea, barras, donut) interactivas: puntero o arrastre muestra valor exacto, guía y punto resaltado (src/app/interactivo.js). Curso hasta la PAU con cifra grande, acumulado y horas por asignatura. Calendario con panel de próximos exámenes (columna lateral ≥1200 px, debajo en iPad vertical). Escala del eje Y adaptada a horas grandes.

## v44 · Hoy idéntico a la maqueta en grande
Tipografía ligera (Avenir Next / SF Rounded, pesos 300-400), saludo «Hola, estudiante», anillo grueso con «Progreso del día», tres cifras con separadores, píldoras Tarea/Examen/Fallo, «Siguiente sesión» con Empezar rosa y Hecho/No hecho con contorno, resto del día con círculos, horas con píldoras 7 d/30 d/3 m/Curso, exámenes con barra y asignaturas con barra de color y «hechas / previstas». Menú lateral plano con esfera de marca, Asignaturas y Ajustes abajo. Tests actualizados: se permite peso 300 (no 100/200) y Asignaturas vuelve al menú.

## v44b · Tipografía Manrope (recomendada por ChatGPT)
Títulos 400, subtítulos 500, texto 400, cifras 600, botones 600, etiquetas 500. Se carga desde Google Fonts (única excepción a «sin recursos externos»); sin conexión usa Avenir Next / SF del sistema. No se pudo incrustar el archivo de la fuente porque el entorno no alcanza los registros de paquetes: pendiente si se aporta el .woff2.

## v45 · Cuotas semanales por asignatura (acordadas con el usuario)
El relleno diario deja de ser «una sesión en días vacíos»: ahora completa cada día hasta el objetivo de horas (3 h entre semana, 5 h sábado y domingo, limitado por el máximo diario y las ventanas libres) eligiendo la asignatura a la que más falta para su cuota semanal (relativa). Cuotas en horas/semana: Matemáticas II 3, Business 3, Física 3, Química 3, Lengua 3, Catalán 3, Historia de España 3, Filosofía 2, Inglés 1 (≈24 h). Inclinación: +10 % ahora, −15 % hacia la PAU. Business sube su factor de horas de examen a 1,2 (necesita un 10). Varias sesiones por día permitidas; el trabajo real (exámenes, tareas) sigue mandando y el relleno solo completa. Pendiente: «temario aprendido 3 semanas antes de cada semana de exámenes» (requiere fechas de los exámenes de trimestre). Tests 311/311.

## v46 (3-nov-2026) — horas mínimas visibles; lo aplicado del informe
- Las cuotas semanales acordadas son el **mínimo**: la inclinación hacia la PAU ya no baja de 1,0 (antes llegaba a ×0,85), solo sube (+10 % ahora).
- Hoy: tarjeta «Horas mínimas de la semana» (hechas + previstas frente al mínimo, las 9 asignaturas) y barra «Carga de hoy» frente al máximo diario. Hoy sigue sin avisos de déficit.
- Curso hasta la PAU: si no caben los mínimos de esta semana o la próxima, dice cuánto falta y de qué asignaturas (con la disponibilidad actual faltan unas 3 h/semana: lunes y martes solo tienen una ventana).
- Del informe NO aplicado todavía (altera horas o falta verificar): reparto por valor marginal (Mates 4,5 / Física 4), pesos UIB (Business no pondera en Informática UIB; comprobar tabla 2027-28), FSRS completo, X−21 por trimestre.
- Pruebas: npm test 312/312, estrés 6000 estados 0 fallos, Chromium 42/42.

## v47 (3-nov-2026) — qué hacer en cada sesión y nuevo objetivo de carrera
- Las sesiones de «Estudio diario» muestran el **tema concreto** (el menos dominado de la asignatura, según Temario) y la actividad según su nivel: rojo → Aprender, amarillo → Practicar, verde → Repasar, con el método de cada asignatura. Si la asignatura no tiene temas: «Sin tema asignado» y se indica añadirlos en Temario. Antes el nombre del tema se guardaba pero no se enseñaba.
- Objetivo desde hoy: Economía, Economía + Matemáticas o Ciencia de Datos (Ingeniería Informática descartada). Pesos de valor aproximados (no verificados por universidad): Matemáticas II y Business arriba; Física 0,18 y Química 0,13 (antes 0,23). Solo cambian las horas extra de examen; las cuotas mínimas por asignatura no se tocan.
- Pruebas: npm test 313/313, estrés 0 fallos, Chromium 42/42 (ejecutadas). Pendiente: comprobar en el iPad y la tabla oficial de ponderaciones de la universidad destino.

## v48 (3-nov-2026) — sin cálculos a la vista
- Fuera de pantalla (el sistema no cambia): explicaciones de fórmulas y citas en Progreso, Curso, Temario, Exámenes, Notas y Estimaciones; la sección «Lo que aprende el planificador»; la tarjeta de proyección del Curso. Implementado en src/app/limpio.js (filtra párrafos técnicos al pintar; los cálculos siguen intactos).
- «Método de estudio» y «Estimaciones» salen del menú y quedan en Ajustes → Avanzado, junto al interruptor de las sesiones diarias de relleno.
- Tests adaptados a propósito (menú y secciones). Ejecutado: npm test 313/313, estrés 0 fallos, Chromium 42/42. No probado en iPad.

## v48b (3-nov-2026) — ingeniería descartada del todo
- Eliminadas las referencias a Ingeniería/GITI en etiquetas, comentarios y pruebas; el objetivo de admisión por defecto queda neutro («ajústalo a tu grado»). El objetivo es Economía, Economía + Matemáticas o Ciencia de Datos. Ejecutado: npm test 313/313.

## v49 (4-nov-2026) — las horas mínimas dependen de lo que dominas
- Causa: la cuota semanal por asignatura no miraba el dominio del temario: Filosofía con todo en verde seguía recibiendo sus 2 h/semana de relleno (el examen sí desaparece con preparación 100 %).
- Ahora (quotaMap en diario.js): con dominio > 60 % la cuota baja progresivamente hasta el 40 % (mínimo 1 h de mantenimiento) y las horas liberadas pasan, en tramos de 30 min (máx. +1 h cada una), a las asignaturas menos dominadas según lo que les falta × su valor. Sin temas apuntados no cambia nada. Hoy muestra la cuota ajustada.
- Ejecutado: npm test 314/314, estrés 0 fallos, Chromium 42/42. No comprobado con tus datos reales (no sincronizados).

## v50 (4-nov-2026) — sesiones de Filosofía → Historia de España (a petición)
- Migración única (migrateFiloHist, fhV=1): quita todas las sesiones futuras de relleno de Historia de la Filosofía salvo las del domingo (quedan fijas); cuota semanal Filosofía 0, Historia de España 5 h (3 + 2). Los exámenes de Filosofía y sus sesiones no se tocan. Hoy oculta las asignaturas con cuota 0.
- Ejecutado: npm test 315/315, estrés 0 fallos, Chromium 42/42.

## v51 (4-nov-2026) — revertido v50
- El cambio de Filosofía → Historia de España no era lo que se quería. Quien ya lo había recibido (fhV=1) recupera las cuotas de Filosofía y Historia de España y sus sesiones dejan de estar fijas; el futuro se regenera una vez. Ejecutado: npm test 315/315, estrés 0 fallos, Chromium 42/42.

## v52 (5-nov-2026) — tardes enteras a una sola asignatura
- Nueva preferencia (activada por defecto; Ajustes → «Tardes enteras a una sola asignatura»): el relleno diario sigue con la misma asignatura hasta cubrir su cuota semanal en vez de repartir cada tarde entre varias. En los días con poco hueco (lunes/martes) se elige una asignatura cuya cuota restante cabe. La inclinación +10 % se desactiva con el foco para no inflar cuotas. Una vez se regenera el futuro.
- Medido con datos de prueba: de 3,0 a ~1,4 asignaturas por día. Con la disponibilidad por defecto (21 h/semana frente a 24 h) siguen faltando horas: en la simulación Business −1 h y Física −2 h.
- Ejecutado: npm test 316/316, estrés 0 fallos, Chromium 42/42.
