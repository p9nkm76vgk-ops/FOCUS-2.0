/* v20 · Horas realmente estudiadas para cada examen (solo sesiones hechas; actualMin si existe) */
function studyOf(w){const bs=S.blocks.filter(b=>b.workId===w.id),dn=bs.filter(b=>b.status==='done'),min=dn.reduce((x,b)=>x+(b.actualMin??(b.end-b.start)),0),pl=bs.filter(b=>b.status==='planned').reduce((x,b)=>x+b.end-b.start,0);return{min,n:dn.length,planned:pl,total:min+pl}}
function studiedTxt(w){const s=studyOf(w);return s.n?` · ${hr(s.min)} estudiadas`:''}
function studiedLine(w){const s=studyOf(w);if(!s.n)return'Aún no hay sesiones hechas para este examen.';return`Te has preparado <b>${hr(s.min)}</b> en ${s.n} ${s.n===1?'sesión':'sesiones'}${s.planned?` · te quedan ${hr(s.planned)} previstas`:''}.`}
{const p=HY.post;HY.post=n=>{let h=p(n);const d=n.date;
 if(!h){const ex=S.works.find(w=>w.kind==='exam'&&w.status!=='archived'&&w.auto!=='review'&&w.dueDate===d&&n.minute<870);if(ex){const s=sub(ex.subjectId);return`<div class=card style="--c:${s.color}"><h3>Hoy: examen de ${esc(s.name)}</h3><p class=m>${studiedLine(ex)}</p></div>`}return h}
 const m=/data-(?:a=autopsia|a=gradeFor) data-id="([^"]+)"/.exec(h)||/data-a=(?:autopsia|gradeFor) data-id="([^"]+)"/.exec(h);const w=m&&S.works.find(x=>x.id===m[1]);
 return w&&studyOf(w).n?h.replace('<p class=m>',`<p class=m>${studiedLine(w)}</p><p class=m>`):h}}
/* v20.1 · Quitar un examen ya hecho: archivar (conserva horas y nota) o eliminar del todo */
Object.assign(A,{examQuit:t=>{const w=S.works.find(x=>x.id===t.dataset.id);if(!w)return;const hrs=studyOf(w);
 choose('Quitar «'+w.title+'»',hrs.n?`Tienes ${hr(hrs.min)} estudiadas para este examen.`:'',[
  ...(w.status!=='archived'?[{l:'Archivar (conserva horas y nota)',c:'pri',fn:()=>{w.status='archived';commit({quiet:true})}}]:[]),
  {l:'Eliminar del todo',c:'danger',fn:()=>{if(confirm('Se borran el examen y sus sesiones (también las horas estudiadas). La nota que apuntaste se conserva. ¿Seguro?')){S.works=S.works.filter(x=>x.id!==w.id);S.blocks=S.blocks.filter(b=>b.workId!==w.id);commit({quiet:true})}}},
  {l:'Cancelar',fn:()=>{}}])}});

/* v33 · Eliminar un examen/tarea desde su formulario: siempre funciona, con una pantalla propia (sin confirm nativo) que explica qué se pierde; si hay horas estudiadas, se ofrece archivar */
function delAsk(id){const w=S.works.find(x=>x.id===id);if(!w)return;const hrs=studyOf(w),np=S.blocks.filter(b=>b.workId===id&&b.status==='planned').length,E=w.kind==='exam';
 const info=hrs.n?`Tienes ${hr(hrs.min)} estudiadas en ${hrs.n} sesión${hrs.n>1?'es':''} de este ${E?'examen':'trabajo'}. Si lo eliminas del todo, esas horas dejan de contar en tus estadísticas.`:`Se quitan también sus ${np} sesiones planificadas y el plan se recalcula sin ${E?'él':'ello'}.`;
 choose('Eliminar «'+w.title+'»',`<p class=m>${info}</p>`,[
  ...(hrs.n&&w.status!=='archived'?[{l:'Archivar (conserva horas y nota)',c:'pri',fn:()=>{w.status='archived';w.updatedAt=Date.now();commit({quiet:true})}}]:[]),
  {l:hrs.n?'Eliminar del todo':'Eliminar',c:'danger',fn:()=>{S.works=S.works.filter(x=>x.id!==id);S.blocks=S.blocks.filter(b=>b.workId!==id);commit({quiet:true})}},
  {l:'Cancelar',fn:()=>{}}])}
