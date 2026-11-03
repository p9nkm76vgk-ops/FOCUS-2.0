/* ===== v42 · Tareas con filtros, Exámenes con cifras, Asignaturas en teselas (maqueta) ===== */
HY.tf=HY.tf||'all';
A.tarFilter=t=>{HY.tf=t.dataset.id;render()};
{const t0=V.tar;V.tar=a=>{const o=t0(a),n=now(),F=[['all','Todas'],['hoy','Hoy'],['sem','Esta semana'],['atr','Atrasadas']],
  chips=`<div class=chipsrow>${F.map(([k,l])=>`<button class="chp${HY.tf===k?' on':''}" data-a=tarFilter data-id=${k} aria-pressed=${HY.tf===k}>${l}</button>`).join('')}</div>`,
  ok={all:null,hoy:['Hoy'],sem:['Hoy','Mañana','Esta semana'],atr:['Atrasadas']}[HY.tf],
  parts=o.split('<h2 class=gh>'),head=parts.shift(),tailI=(parts[parts.length-1]||'').search(/<details class=more|<p class=m>/);
  let tail='';if(parts.length&&tailI>=0){const l=parts.length-1;tail=parts[l].slice(tailI);parts[l]=parts[l].slice(0,tailI)}
  const keep=ok?parts.filter(p=>ok.some(g=>p.startsWith(g+'</h2>'))):parts,
   body=keep.map(p=>'<h2 class=gh>'+p).join('')+(ok?'':tail);
  if(/class=empty/.test(o)&&!parts.length)return o.replace(/<\/div>(?=<div class=empty)/,'</div>'+'');
  return head+chips+(body||`<div class=empty><i>${ic('tar')}</i><b>¡Todo al día!</b><p class=m>No tienes tareas en este filtro.</p></div>`)}}
{const e0=V.exa;V.exa=a=>{const o=e0(a),n=now(),ex=S.works.filter(w=>w.kind==='exam'&&w.auto!=='review'&&w.status!=='archived'&&w.status!=='done'&&w.dueDate>=n.date).sort((x,y)=>x.dueDate.localeCompare(y.dueDate));
  if(!ex.length)return o;const avg=Math.round(ex.reduce((s,w)=>s+hoyPrep(w),0)/ex.length),d=P.daysBetween(n.date,ex[0].dueDate),
   k=`<div class=ktiles><div class="card kt">${anRing(avg,96,'Preparación media',null)}<small>Preparación</small></div><div class="card kt"><b class=bign>${d}</b><small>${d===1?'día':'días'} hasta el próximo</small></div><div class="card kt"><b class=bign>${ex.length}</b><small>exámenes por delante</small></div></div>`;
  return o.replace(/(<div class=ph>[\s\S]*?<\/div>)/,m=>m+k)}}
{const g0=V.asg;V.asg=id=>{const o=g0(id);if(id&&S.subjects.some(s=>s.id===id))return o;const n=now(),mon=mondayOf(n.date),rows=S.blocks.filter(b=>b.status!=='rescheduled'),
  tiles=S.subjects.filter(s=>!s.archived).map(s0=>{const s=sub(s0.id),ws_=S.works.filter(w=>w.subjectId===s.id),ids=new Set(ws_.map(w=>w.id)),wk=anAgg(rows.filter(b=>ids.has(b.workId)),mon,addDays(mon,6)),tot=rows.filter(b=>ids.has(b.workId)&&b.status==='done').reduce((a,b)=>a+(b.actualMin??b.end-b.start),0),nx=ws_.filter(w=>w.kind==='exam'&&w.auto!=='review'&&w.status!=='done'&&w.status!=='archived'&&w.dueDate>=n.date).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0];
   return`<div class=stile style="--c:${s.color}" data-a=nav data-r="asg:${esc(s.id)}" role=button tabindex=0><b>${esc(s.name)}</b><span class=sh>${anH(wk.done)} <em>/ ${anH(wk.plan)} esta semana</em></span><small>${nx?'Próx.: '+fd(nx.dueDate):'Sin examen próximo'} · ${anH(tot)} en total</small></div>`}).join('');
  return`<div class=ph><h1>Asignaturas</h1><button class=pri data-a=addSub>+ Asignatura</button></div><div class=sgrid>${tiles}</div>`}}

/* Curso hasta la PAU: cifra grande + acumulado + horas por asignatura (maqueta 8) */
{const c0=V.cur;V.cur=a=>{const o=c0(a),g=S.goals,p=g&&g.pauDate?projectCourse():null;if(!p)return o;
  const ms=Object.keys(p.byM).sort();let acc=0;const cum=ms.map(m=>{const x=p.byM[m];acc+=x.d+x.p+x.y;return acc}),
   ss=Object.entries(p.byS).sort((x,y)=>y[1]-x[1]),mx=Math.max(60,...ss.map(x=>x[1])),
   qa=quotaCheck(mondayOf(now().date)),qb=quotaCheck(addDays(mondayOf(now().date),7)),qw=(qa.miss||qb.miss)?`<div class="card bc qcard" role=status><small class=lab>Horas mínimas por asignatura</small><p class=m>${qa.miss?`Esta semana faltan <b>${anH(qa.miss)}</b> para llegar a los mínimos (${qa.rows.filter(r=>r.miss).map(r=>esc(r.s.name)).join(', ')}). `:''}${qb.miss?`La semana que viene no caben <b>${anH(qb.miss)}</b>: ${qb.rows.filter(r=>r.miss).map(r=>esc(r.s.name)).join(', ')}. `:''}Para cumplirlos, amplía tu disponibilidad (sobre todo lunes y martes) en Ajustes; no se recorta ninguna asignatura en silencio.</p></div>`:'',
   hero=`<div class=brow><div class="card bc"><div class=bch><div><small class=lab>Horas del curso hasta la PAU</small><b class=bign>${anH(p.total)}</b><span class=m>${anH(p.done)} hechas · ${anH(p.plan)} previstas · ${anH(p.avg)} por semana</span></div></div>${anLine(cum,ms.map(m=>MESES[+m.slice(5)-1]),{label:'Horas acumuladas del curso'})}</div>
<div class="card bc"><div class=bch><div><small class=lab>Horas por asignatura</small></div></div>${ss.map(([id,v])=>{const s=sub(id);return`<div class=wli style="--c:${s.color}"><i class=dot></i><div><b>${esc(s.name)}</b><div class=xbar><i style="width:${Math.round(100*v/mx)}%"></i></div></div><span class=hrs><b>${anH(v)}</b></span></div>`}).join('')}</div></div>`;
  return o.replace(/(<h1>[^<]*<\/h1>)/,m=>m+qw+hero)}}
/* Calendario: panel de próximos exámenes (maqueta 2) */
{const k0=V.cal;V.cal=a=>{const o=k0(a),n=now(),ex=S.works.filter(w=>w.kind==='exam'&&w.auto!=='review'&&w.status!=='archived'&&w.status!=='done'&&w.dueDate>=n.date).sort((x,y)=>x.dueDate.localeCompare(y.dueDate)).slice(0,5);
  if(!ex.length)return o;const pn=`<aside class="card bc calside"><div class=bch><div><small class=lab>Próximos exámenes</small></div></div>${ex.map(w=>{const s=sub(w.subjectId),d=P.daysBetween(n.date,w.dueDate);return`<div class=wli data-a=editExam data-id="${esc(w.id)}" role=button tabindex=0 style="--c:${s.color}"><i class=dot></i><div><b>${esc(s.name)}</b><small>${fd(w.dueDate)} · ${d===0?'hoy':d===1?'mañana':'en '+d+' días'}</small></div></div>`}).join('')}</aside>`;
  return`<div class=calwrap><div class=calmain>${o}</div>${pn}</div>`}}

/* Menú lateral plano como en la maqueta: marca con esfera, 8 secciones y Ajustes abajo */
IC.asg='<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 16.5 9 5 9-5"/>';
function renderNav(){const [r,arg]=route.split(':'),cur=k=>r===k||(k==='aj'&&false)?' aria-current=page':'',
 item=(k,g,l)=>`<button class=nv title="${l}" aria-label="${l}" data-a=nav data-r=${k}${cur(k)}>${ic(g)}<span class=lbl>${l}</span></button>`;
 document.body.classList.toggle('rail',UI.rail);
 $('#nav').innerHTML=`<div class=brand><span>Focus OS</span><button data-a=rail aria-label="${UI.rail?'Expandir':'Contraer'} menú">${ic(UI.rail?'gt':'lt')}</button></div><button class="nv srch" data-a=search aria-label="Buscar" title="Buscar (tecla /)">${ic('srch')}<span class=lbl>Buscar…</span><kbd>/</kbd></button>`
 +'<div class=nvl>'+item('hoy','hoy','Hoy')+item('cal','cal','Calendario')+item('tar','tar','Tareas')+item('exa','exa','Exámenes')+item('tem','tem','Temario')+item('asg','asg','Asignaturas')+item('seg','seg','Progreso')+item('obj','obj','Notas y objetivo')+item('cur','cur','Curso hasta la PAU')+item('met','met','Método de estudio')+item('est','est','Estimaciones')+'</div>'+item('aj','aj','Ajustes');
 const tb=(k,g,l)=>`<button data-a=nav data-r=${k} aria-label="${l}"${cur(k)}>${ic(g)}<span>${l}</span></button>`,more=['tem','met','obj','cur','seg','est','aj','asg'].includes(r);
 const tabs=$('#tabs');if(tabs)tabs.innerHTML=tb('hoy','hoy','Hoy')+tb('cal','cal','Calendario')+tb('tar','tar','Tareas')+tb('exa','exa','Exámenes')+`<button data-a=menu aria-label="Más"${more?' aria-current=page':''}>${ic('more')}<span>Más</span></button>`}
