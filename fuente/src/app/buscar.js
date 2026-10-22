/* Búsqueda global: pantallas, acciones, tareas, exámenes, temas y asignaturas. Atajo: «/» o Ctrl/⌘+K. */
const SCR=[['hoy','Hoy','inicio resumen sesiones'],['cal','Calendario','semana agenda horario bloques'],['tar','Tareas','deberes entregas pendientes'],['exa','Exámenes','examen parcial prueba'],['tem','Temario','temas guion materia'],['met','Método de estudio','fases guion memorizar autopsia reparto'],['obj','Notas y objetivo','notas nota media objetivo evaluación'],['cur','Curso hasta la PAU','pau selectividad fases'],['seg','Progreso y estadísticas','seguimiento cumplimiento horas gráficos'],['rut','Rutina semanal','hábitos rutina regenerar'],['est','Estimaciones','estimador tiempo minutos'],['aj','Ajustes','configuración horario clases copia exportar importar cuenta']];
const SACT=[['addTask','Nueva tarea','añadir crear apuntar deber'],['addExam','Nuevo examen','añadir crear apuntar'],['addBlk','Nueva sesión','añadir crear bloque estudio'],['addErr','Anotar un fallo','cuaderno de errores fallo']];
const nrm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function searchItems(q){const toks=nrm(q).split(/\s+/).filter(Boolean),out=[];
 const push=(kind,title,sub_,color,go,kw)=>{const T=nrm(title),H=T+' '+nrm(sub_)+' '+nrm(kw);if(!toks.every(t=>H.includes(t)))return;
  const sc=!toks.length?5:T.startsWith(toks[0])?0:T.split(/\s+/).some(w=>w.startsWith(toks[0]))?1:T.includes(toks[0])?2:3;out.push({kind,title,sub:sub_,color,go,sc})};
 for(const [r,l,kw] of SCR)push('Pantalla',l,'',null,()=>A.nav({dataset:{r}}),kw);
 for(const [a,l,kw] of SACT)push('Acción',l,'',null,()=>A[a]({dataset:{}}),kw);
 for(const s of S.subjects.filter(x=>!x.archived))push('Asignatura',s.name,'',sub(s.id).color,()=>A.nav({dataset:{r:'asg:'+s.id}}),'');
 const td=now().date;
 for(const w of S.works.filter(w=>w.status!=='archived'&&w.auto!=='review').sort((a,b)=>(a.status==='done')-(b.status==='done')||a.dueDate.localeCompare(b.dueDate))){const s=sub(w.subjectId);
  push(w.kind==='exam'?'Examen':'Tarea',w.title||'(sin título)',s.name+(isUndated(w)?' · sin fecha':' · '+fd(w.dueDate))+(w.status==='done'?' · hecha':''),s.color,()=>A[w.kind==='exam'?'editExam':'editTask']({dataset:{id:w.id}}),'')}
 for(const t of S.syllabus||[])push('Tema',t.name,sub(t.subjectId).name,sub(t.subjectId).color,()=>A.nav({dataset:{r:'tem'}}),'');
 return out.sort((a,b)=>a.sc-b.sc).slice(0,toks.length?10:8)}
let SRES=[];
function searchOpen(){const d=$('#dlg');d.innerHTML=`<div id=f class=srchbox><input id=sq type=text enterkeyhint=search placeholder="Buscar tareas, exámenes, temas, pantallas…" autocomplete=off autocapitalize=off spellcheck=false aria-label="Buscar"><div id=sr role=listbox></div></div>`;if(!d.open)d.showModal();
 const inp=$('#sq'),draw=()=>{SRES=searchItems(inp.value);$('#sr').innerHTML=SRES.length?SRES.map((x,i)=>`<button type=button class="sri${i===0?' on':''}" role=option data-a=sgo data-i=${i}>${x.color?`<i class=dot style="--c:${x.color}"></i>`:'<i class=dot style="--c:var(--line)"></i>'}<span class=sit><b>${esc(x.title)}</b>${x.sub?`<small>${esc(x.sub)}</small>`:''}</span><span class=sk>${x.kind}</span></button>`).join(''):'<p class=m style="padding:12px">Nada coincide.</p>'};
 inp.oninput=draw;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchGo(0)}};draw();setTimeout(()=>inp.focus&&inp.focus(),30)}
function searchGo(i){const x=SRES[i];if(!x)return;const d=$('#dlg');if(d.open)d.close();document.body.classList.remove('open');x.go()}
Object.assign(A,{search:()=>searchOpen(),sgo:t=>searchGo(+t.dataset.i)});
document.addEventListener('keydown',e=>{const el=e.target,typing=el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable);
 if(((e.key==='k'||e.key==='K')&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!typing&&!e.metaKey&&!e.ctrlKey)){e.preventDefault();searchOpen()}});
