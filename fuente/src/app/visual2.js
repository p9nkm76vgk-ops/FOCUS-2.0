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
