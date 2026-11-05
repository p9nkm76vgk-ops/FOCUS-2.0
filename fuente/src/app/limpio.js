/* v48 · Sin cálculos a la vista. Nada se elimina del sistema (el planificador, las estimaciones y el método siguen funcionando igual):
   solo se quitan de la pantalla las explicaciones de fórmulas, citas y proyecciones. Lo técnico queda en Ajustes → Avanzado. */
const TECHRX=/(Dunlosky|Roediger|Cepeda|Rohrer|literatura|se asume|proyección|orientativos|ajusta sus horas|Barra dorada|Línea dorada|Horas = |Cumplimiento = |algoritmo|no se inventa|Por qué:|g=0|Capacidad teórica|«Cargada»|Aún tengo pocos datos|Se mide con|Resumen por reglas|Si cumples todo el plan)/;
const sinTecnico=h=>h.replace(/<p class="?m"?[^>]*>(?:[^<]|<(?!\/p>))*<\/p>/g,m=>TECHRX.test(m.replace(/<[^>]+>/g,''))?'':m);
const sinSeccion=(h,titulo)=>{const i=h.indexOf('<h2>'+titulo+'</h2>');if(i<0)return h;const j=h.indexOf('<h2>',i+10);return h.slice(0,i)+(j<0?'':h.slice(j))};
for(const k of ['seg','cur','tem','est','exa','obj']){const v0=V[k];V[k]=a=>sinTecnico(v0(a))}
{const s0=V.seg;V.seg=a=>sinSeccion(s0(a),'Lo que aprende el planificador')}
{const c0=V.cur;V.cur=a=>{const h=c0(a),i=h.indexOf('<div class=card data-sec=proy>');if(i<0)return h;let d=0,k=i;const t=/<div\b|<\/div>/g;t.lastIndex=i;let m;while((m=t.exec(h))){d+=m[0]==='</div>'?-1:1;if(d===0){k=t.lastIndex;break}}return h.slice(0,i)+h.slice(k)}}
{const a0=V.aj;V.aj=a=>a0(a)+`<details class="card adv"><summary><b>Avanzado</b></summary><p class=m>Detalles técnicos del planificador. No hace falta tocarlos.</p><div class=row style="justify-content:flex-start"><button data-a=nav data-r=met>Método de estudio</button><button data-a=nav data-r=est>Estimaciones</button><button data-a=dailyToggle>${S.goals&&S.goals.dailyOff?'Activar':'Quitar'} las sesiones diarias de relleno</button></div></details>`}

/* v53 · Versión visible y botón de actualización forzada (no toca los datos: solo borra la caché de la app y la recarga). */
const APP_VER = '61';
{const a0=V.aj;V.aj=a=>a0(a)+`<div class=card data-sec=ver><h3>Versión de la app</h3><p class=m>Focus OS versión <b>${APP_VER}</b>. Si no coincide con la última que te he indicado, pulsa el botón: se descarga la versión nueva sin perder tus datos.</p><div class=row style="justify-content:flex-start"><button data-a=forceUpdate>Buscar actualización</button></div></div>`}
Object.assign(A,{forceUpdate:async()=>{toast('Actualizando…');try{const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('focusos-')).map(k=>caches.delete(k)))}catch{}setTimeout(()=>location.reload(),400)}});
