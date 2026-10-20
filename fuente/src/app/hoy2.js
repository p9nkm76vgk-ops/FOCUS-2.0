/* Hoy, versión sin ruido: lo que toca AHORA (con Hecho / No hecho a un toque), el resto del día en una línea cada sesión, exámenes cercanos
   y, plegado, todo lo demás (estadísticas, prioridades, sugerencias). Sin avisos ni paneles de estado. */
const HY={open:{},
 items(n){const o=S.blocks.filter(b=>b.date===n.date&&b.status!=='rescheduled').map(b=>({t:'ob',id:b.id,start:b.start,end:b.end,st:b.status,b})),
  h=(S.habit||[]).filter(x=>x.date===n.date&&(x.status==='planned'||x.status==='done')).map(x=>({t:'hab',id:x.id,start:x.start,end:x.end,st:x.status,h:x}));return[...o,...h].sort((a,b)=>a.start-b.start||a.end-b.end)},
 info(it){if(it.t==='ob'){const w=wk(it.b.workId)||{},s=sub(w.subjectId),ph=phaseOf(it.b);return{s,title:(w.title||'')+(it.b.part==='review'?' · repaso':'')+(it.b.topicId?' · '+wTopic(it.b):''),ph,how:MET.howFor(s.name,s.colorKey,{review:it.b.part==='review',phase:ph})}}
  const s=sub(it.h.subjectId);return{s,title:it.h.title.replace(s.name+': ',''),ph:undefined,how:it.h.detail?it.h.title.replace(s.name+': ','')+': '+it.h.detail:''}},
 btns(it,big){const id=esc(it.id),c=big?' big':'';return it.t==='ob'?`<button class="pri${c}" data-a=quickDone data-id="${id}">✓ Hecho</button><button class="${c.trim()}" data-a=noHecho data-id="${id}">No hecho</button>`:`<button class="pri${c}" data-a=habQuick data-id="${id}">✓ Hecho</button><button class="${c.trim()}" data-a=habSkip data-id="${id}">No hecho</button>`},
 hero(n,it){const i=HY.info(it),now_=it.start<=n.minute,dur=it.end-it.start,sp=i.how.indexOf(': '),ht=sp>0?i.how.slice(0,sp):'',hd=sp>0?i.how.slice(sp+2):i.how;
  return`<div class=hero style="--c:${i.s.color}"><small class=lab>${now_?'Ahora':'Siguiente'} · ${fm(it.start)}–${fm(it.end)} · ${dur} min</small><h2 class=hn>${esc(i.s.name)}</h2><p class=hs>${esc(i.title)}${i.ph?` <span class=chip>${i.ph==='comprender'?'Comprender':'Practicar'}</span>`:''}</p>${hd?`<details class=how2><summary>${esc(ht||'Qué hacer')}</summary><p>${esc(hd)}</p></details>`:''}<div class=hb>${it.t==='ob'&&it.b.date===n.date&&!UI.timer?`<button class="big" data-a=timerStart data-id="${esc(it.id)}">▶ Empezar</button>`:''}${HY.btns(it,true)}</div></div>`},
 row(it){const i=HY.info(it),done=it.st==='done';return`<div class="tr ${it.st}" style="--c:${i.s.color}"><span class=t>${fm(it.start)}</span><i class=dot></i><div class=m1><b>${esc(i.s.name)}</b><small>${esc(i.title)}${i.ph?' · '+(i.ph==='comprender'?'comprender':'practicar'):''}</small></div><div class=ra>${done?'<span class=okm>✓</span>':HY.btns(it,false)}</div></div>`},
 exams(n){const l=act().filter(w=>w.kind==='exam'&&w.dueDate>=n.date&&w.auto!=='review').sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,3);
  return l.length?`<div class=chips>${l.map(w=>{const d=P.daysBetween(n.date,w.dueDate);return`<span class="chip${d<=3?' hot':''}">${esc(sub(w.subjectId).name)} · ${d===0?'hoy':d===1?'mañana':'en '+d+' días'}</span>`}).join('')}</div>`:''},
 cls(n){const c=TT.next(n);return c?`<p class=m>Próxima clase: <b>${esc(c.name)}</b> · ${c.k===0?'hoy':c.k===1?'mañana':DOW[weekday(c.date)]} ${fm(c.start)}</p>`:''}
};
{const full=V.hoy;V.hoy=a=>{const n=now(),all=full(a),its=HY.items(n),pend=its.filter(x=>x.st==='planned'&&x.end>n.minute),first=pend[0],tc=timerCard(),doneN=its.filter(x=>x.st==='done').length,
  head=`<h1>Hoy</h1><p class=m>${fdl(n.date)}${its.length?` · ${doneN} de ${its.length} sesiones`:''}</p>`;
  const rest=its.filter(x=>x!==first&&!(tc&&UI.timer&&x.id===UI.timer.id)),
   hero=tc||(first?HY.hero(n,first):`<div class=hero><h2 class=hn>${its.length?'Hecho por hoy':'Nada que estudiar hoy'}</h2><p class=hs>${its.length?'Has cerrado todas las sesiones de hoy.':'Disfruta del descanso.'}</p></div>`);
  const body=all.replace(/<h1>Hoy<\/h1><p class=m>[^<]*<\/p>/,'').replace(tc,'');
  return head+hero+HY.exams(n)+HY.cls(n)+(rest.length?`<div class=tl>${rest.map(HY.row).join('')}</div>`:'')+`<div class=quick><button data-a=addTask>+ Tarea</button><button data-a=addExam>+ Examen</button><button data-a=addBlk>+ Sesión</button></div><details class=more data-k=hoy${HY.open.hoy?' open':''}><summary>Más: estadísticas, prioridades y sugerencias</summary>${body}</details>`}}
Object.assign(A,{noHecho:t=>{const b=S.blocks.find(x=>x.id===t.dataset.id);if(!b||b.status!=='planned')return;const n=now();b.status='skipped';if(b.date>n.date||b.end>n.minute)b.reason='otro';commit({quiet:true})},
 habQuick:t=>{S.habit=S.habit.map(x=>x.id===t.dataset.id?{...x,status:'done',actualMin:x.end-x.start}:x);commit({quiet:true})}});
/* Rutina: la configuración y las actividades fijas quedan plegadas; arriba, el estado y «Regenerar». */
{const r0=V.rut;if(r0)V.rut=a=>r0(a).replace('<form id=rf class=card>',`<details class=more data-k=rut${HY.open.rut?' open':''}><summary>Configuración, frecuencias y actividades fijas</summary><form id=rf class=card>`).replace('<button data-a=rutFixed>Añadir actividad fija</button></div>','<button data-a=rutFixed>Añadir actividad fija</button></div></details>')}

document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.matches&&d.matches('details.more[data-k]'))HY.open[d.dataset.k]=d.open},true);
