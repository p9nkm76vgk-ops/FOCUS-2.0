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
