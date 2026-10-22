/* Fases por asignatura (editables), autopsia del examen, confianza previa y estados de guion por tema. Todo vive en el estado: S.methodCfg, S.autopsies, w.confidence, topic.gs. */
const autos=()=>Array.isArray(S.autopsies)?S.autopsies:(S.autopsies=[]);
const GSL=['Sin guion','Guion escrito','Memorizado','Dominado'];
const isGuion=s=>FAS.planFor(s.name,false,(S.methodCfg||{})[s.id]).some(p=>p.id==='escribir');
const CONF=[['1','Nada'],['2','Poco'],['3','Regular'],['4','Bastante'],['5','Mucho']];
const gradeOf=w=>S.grades.find(x=>x.workId===w.id);
Object.assign(HY,{
 week(n){const mon=addDays(n.date,-((weekday(n.date)+6)%7)),L=['L','M','X','J','V','S','D'],ds=[...Array(7)].map((_,i)=>addDays(mon,i)),mm=ds.map(d=>{const bs=S.blocks.filter(b=>b.date===d&&(b.status==='planned'||b.status==='done'));return{d,p:bs.reduce((a,b)=>a+b.end-b.start,0),h:bs.filter(b=>b.status==='done').reduce((a,b)=>a+b.end-b.start,0)}}),mx=Math.max(60,...mm.map(x=>x.p));
  if(!mm.some(x=>x.p))return'';
  return`<button class=wstrip data-a=nav data-r=cal aria-label="Ver la semana en el calendario">${mm.map((x,i)=>`<span class="wd${x.d===n.date?' now':''}${x.d<n.date?' past':''}"><span class=bars><i class=pl style="height:${Math.round(100*x.p/mx)}%"></i><i class=dn style="height:${Math.round(100*x.h/mx)}%"></i></span><b>${L[i]}</b></span>`).join('')}</button>`},
 post(n){const ex=S.works.filter(w=>w.kind==='exam'&&w.status!=='archived'&&w.auto!=='review'),d=n.date;
  const au=ex.find(w=>!autos().some(a=>a.workId===w.id)&&!w.autSkip&&((w.dueDate===d&&n.minute>=870)||(w.dueDate<d&&w.dueDate>=addDays(d,-7))));
  if(au){const s=sub(au.subjectId);return`<div class=card style="--c:${s.color}"><h3>¿Qué tal ha ido ${esc(s.name)}?</h3><p class=m>Un minuto para saber si lo que estudiaste funcionó y qué ajustar.</p><div class=row style="justify-content:flex-start"><button class=pri data-a=autopsia data-id="${au.id}">Contarlo</button><button data-a=autSkip data-id="${au.id}">Ahora no</button></div></div>`}
  const cf=ex.find(w=>w.dueDate===addDays(d,1)&&!w.confidence);
  if(cf){const s=sub(cf.subjectId);return`<div class=card style="--c:${s.color}"><h3>Mañana: ${esc(s.name)}</h3><p class=m>¿Cómo de seguro estás? (opcional; sirve para ver si tu sensación es fiable)</p><div class=chips>${CONF.map(c=>`<button data-a=conf data-id="${cf.id}" data-k=${c[0]}>${c[0]} · ${c[1]}</button>`).join('')}</div></div>`}
  const ng=ex.find(w=>autos().some(a=>a.workId===w.id)&&!gradeOf(w)&&w.dueDate<=d&&w.dueDate>=addDays(d,-14));
  if(ng){const s=sub(ng.subjectId);return`<div class=card style="--c:${s.color}"><h3>¿Qué nota sacaste en ${esc(s.name)}?</h3><p class=m>Con la nota real se compara lo que esperabas y se ve si tu estimación es fiable.</p><button class=pri data-a=gradeFor data-id="${ng.id}">Poner nota</button></div>`}
  return''}
});
function autopsyForm(wid){const w=S.works.find(x=>x.id===wid);if(!w)return;const s=sub(w.subjectId),old=autos().find(a=>a.workId===wid)||{},tp=(w.topics||[]).filter(t=>t&&t.name),g=isGuion(s);
 openForm('Autopsia · '+s.name,[{t:'note',v:'Sin darle vueltas: lo que recuerdes. Se usa para ajustar tu método, no para juzgarte.'},
  {k:'expected',l:'Nota que crees que has sacado (0–10)',t:'number',min:0,max:10,step:'0.1',v:old.expected??''},
  {k:'time',l:'Tiempo',t:'chips',o:[['sobro','Me sobró'],['justo','Justo'],['falto','Me faltó']],v:old.time||'justo'},
  {t:'note',v:'<b>¿Qué falló?</b> (marca todo lo que aplique)'},...AUT.CAUSES.map(c=>({k:'c_'+c[0],l:c[1],t:'check',v:(old.causes||[]).includes(c[0])})),
  ...(tp.length?[{t:'note',v:'<b>Temas flojos</b> (pasan al cuaderno de errores)'},...tp.map((t,i)=>({k:'w_'+i,l:t.name,t:'check',v:(old.weakTopics||[]).includes(t.name)}))]:[]),
  {k:'helped',l:'¿Qué estudio te ayudó más?',t:'chips',o:[['','—'],...AUT.HELPED],v:old.helped||''},
  ...(g?[{k:'guion',l:'¿Usaste el método del guion memorizado?',t:'chips',o:[['1','Sí'],['0','No']],v:old.guion===false?'0':'1'},{k:'comments',l:'¿Cuántos comentarios/textos practicaste antes? (opcional)',t:'number',min:0,max:50,v:old.comments??''}]:[])],v=>{
  const causes=AUT.CAUSES.filter(c=>v['c_'+c[0]]).map(c=>c[0]),weak=tp.filter((t,i)=>v['w_'+i]).map(t=>t.name);
  const r=AUT.makeAutopsy({workId:wid,subjectId:w.subjectId,expected:v.expected,time:v.time,causes,weakTopics:weak,helped:v.helped,guion:g?v.guion!=='0':undefined,comments:v.comments},w.dueDate,old.id||uid(),Date.now());if(r.err)return r.err;
  S.autopsies=AUT.saveAutopsy(autos(),r.a);
  for(const t of weak){if(errs().some(f=>f.subjectId===w.subjectId&&f.text==='Tema flojo: '+t&&!f.done))continue;const x=ERR.addFallo(errs(),{subjectId:w.subjectId,text:'Tema flojo: '+t},now().date,uid());if(!x.err)S.errors=x.list}
  commit({quiet:true})})}
function phasesEdit(sid){const s=sub(sid),pl=FAS.planFor(s.name,true,(S.methodCfg||{})[sid]);
 openForm('Fases · '+s.name,[{t:'note',v:'Las fases van en orden: primero las sesiones de la fase 1, al final las de la última. Los porcentajes deben sumar 100.'+(s.name==='Business'?' Este reparto es el de «con cálculo»; sin cálculo es 100 % memorizar.':'')},...pl.flatMap((p,i)=>[{k:'l'+i,l:`Fase ${i+1} · nombre`,v:p.label},{k:'p'+i,l:`Fase ${i+1} · porcentaje`,t:'number',min:0,max:100,v:p.pct},{k:'x'+i,l:`Fase ${i+1} · qué hacer`,t:'area',v:p.text}])],v=>{
  const pcts=pl.map((p,i)=>+v['p'+i]),e=FAS.validatePcts(pcts);if(e)return e;
  const cfg={pcts,labels:pl.map((p,i)=>(v['l'+i]||'').trim()),texts:pl.map((p,i)=>(v['x'+i]||'').trim())},def=FAS.defaultPlan(s.name,true);
  cfg.labels=cfg.labels.map((x,i)=>x||def[i].label);cfg.texts=cfg.texts.map((x,i)=>x||def[i].text);const same=cfg.pcts.every((x,i)=>x===def[i].pct)&&cfg.labels.every((x,i)=>x===def[i].label)&&cfg.texts.every((x,i)=>x===def[i].text),m={...(S.methodCfg||{})};
  if(same)delete m[sid];else m[sid]=cfg;S.methodCfg=m;commit({quiet:true})})}
const phasesBlock=s=>{const cfg=(S.methodCfg||{})[s.id],pl=FAS.planFor(s.name,true,cfg);
 return`<h4 class=cr>Fases de la preparación del examen${cfg?' · personalizado':''}</h4><div class=phs>${pl.map((p,i)=>`<div class=phr><div class=phh><b>${i+1}. ${esc(p.label)}</b><span class=pc>${p.pct} %</span></div><div class=bar><i style="width:${p.pct}%"></i></div><small>${esc(p.text)}</small></div>`).join('')}</div>${s.name==='Business'?'<p class=m>Si el examen no lleva cálculo: 100 % memorizar.</p>':''}<div class=row style="justify-content:flex-start;margin:8px 0"><button data-a=metEdit data-id="${s.id}">Editar fases</button>${cfg?`<button data-a=metReset data-id="${s.id}">Restaurar</button>`:''}</div>`};
const autCard=()=>{const L=autos(),cal=AUT.calibration(L,S.grades),ci=AUT.confidenceInsight(S.works.filter(w=>w.kind==='exam'),S.grades);
 const intro='<p class=m>Resumen por reglas simples, no un algoritmo estadístico: con pocos exámenes son pistas, no conclusiones. Los ajustes los confirmas tú.</p>';
 if(!L.length)return`<div class=card><h3>Autopsia de exámenes</h3>${intro}<p class=m>Aún sin datos. El día de cada examen, a partir de las 14:30, aparecerá en Hoy un formulario de un minuto.</p></div>`;
 const fq=AUT.causeFreq(L),sg=subsAct().flatMap(s=>AUT.suggestions(L,s.id,FAS.planFor(s.name,true,(S.methodCfg||{})[s.id])).map((x,k)=>({s,k,...x})));
 const calT=cal.n<1?'Aún sin notas reales para comparar.':cal.n<3?`Con ${cal.n} examen${cal.n>1?'es':''} comparado${cal.n>1?'s':''} aún no se puede concluir (esperabas ${cal.rows[0].expected} y sacaste ${cal.rows[0].real}).`:cal.mean>0.5?`Sueles esperar ${n1(cal.mean)} puntos más de los que sacas.`:cal.mean<-0.5?`Sueles sacar ${n1(-cal.mean)} puntos más de los que esperas.`:'Tu estimación de nota suele acertar.';
 const ciT={'sin-datos':'Confianza previa: aún sin datos (hacen falta 3 exámenes con confianza y nota).','poco-fiable':`Cuando ibas poco seguro sacaste de media ${n1(ci.low)}: tu sensación de «no voy preparado» no es fiable.`,fiable:`Tu sensación coincide con la nota: poco seguro → ${n1(ci.low)}, seguro → ${n1(ci.high)}.`,neutro:'Tu confianza previa no predice claramente la nota (todavía).'}[ci.verdict];
 return`<div class=card><h3>Autopsia de exámenes</h3>${intro}<p class=m>${L.length>1?L.length+' exámenes analizados':'1 examen analizado'}.</p>${fq.length?`<ul>${fq.slice(0,5).map(f=>`<li><b>${esc(f.label)}</b> · ${f.n} de ${L.length} (${f.pct} %)</li>`).join('')}</ul>`:'<p class=m>Ninguna causa marcada.</p>'}<p class=m>${calT}</p><p class=m>${ciT}</p>${sg.map(x=>`<div class=wr style="--c:${x.s.color}"><i class=dot></i><div class=m1><b>${esc(x.s.name)}</b><small>${esc(x.text)} → ${x.pcts.join(' / ')} %</small></div><div class=ra><button class=pri data-a=metApply data-id="${x.s.id}" data-k=${x.k}>Aplicar</button></div></div>`).join('')}</div>`};
Object.assign(A,{
 autopsia:t=>autopsyForm(t.dataset.id),
 autSkip:t=>{S.works=S.works.map(w=>w.id===t.dataset.id?{...w,autSkip:true}:w);commit({quiet:true})},
 conf:t=>{const k=+t.dataset.k;if(!(k>=1&&k<=5))return;S.works=S.works.map(w=>w.id===t.dataset.id?{...w,confidence:k}:w);commit({quiet:true})},
 metEdit:t=>phasesEdit(t.dataset.id),
 metReset:t=>{if(!confirm('¿Restaurar el reparto y los textos por defecto de esta asignatura?'))return;const m={...(S.methodCfg||{})};delete m[t.dataset.id];S.methodCfg=m;commit({quiet:true})},
 metApply:t=>{const s=sub(t.dataset.id),pl=FAS.planFor(s.name,true,(S.methodCfg||{})[s.id]),x=AUT.suggestions(autos(),s.id,pl)[+t.dataset.k];if(!x)return;const cur=(S.methodCfg||{})[s.id]||{};S.methodCfg={...(S.methodCfg||{}),[s.id]:{...cur,pcts:x.pcts}};commit({quiet:true});toast('Reparto actualizado: '+x.pcts.join(' / ')+' %')},
 gs:t=>{S.syllabus=S.syllabus.map(x=>x.id===t.dataset.id?{...x,gs:((x.gs||0)+1)%4}:x);commit({quiet:true})}
});
