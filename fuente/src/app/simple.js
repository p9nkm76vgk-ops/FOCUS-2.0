/* v36 · Todo fijado por la app: sin «Rutina semanal», sin sugerencias, sin crear sesiones a mano ni tocar huecos del calendario. El plan lo genera el planificador. */
function calSlot(){}
function migrateRutina(Sx){if(Sx.rtV>=1)return;Sx.rtV=1;if(Sx.routine)Sx.routine={...Sx.routine,enabled:false};
 const n=now();Sx.habit=(Sx.habit||[]).filter(h=>h.status==='done'||h.date<n.date)}
