/* v23 · Fines de semana activos (8:00–13:30 y tarde hasta las 20:30; tope 7 h) y «Cómo llegarás» a cada examen */
const WE_OLD='600-810,960-1020,1050-1230';
function migrateWeekend(Sx){if(Sx.weV>=1||!Sx.settings)return;Sx.weV=1;const av=Sx.settings.availability||{},key=d=>(av[d]||[]).map(w=>w.start+'-'+w.end).join(',');
 for(const d of [0,6])if(key(d)===WE_OLD)av[d]=[{start:480,end:810},{start:900,end:1020},{start:1050,end:1230}];
 if(!(Sx.settings.maxDayWeekend>0))Sx.settings.maxDayWeekend=420}
const NIVEL={'Matemáticas II':1,'Física':0,'Química':2,'Business':1,'Lengua Castellana':0,'Catalán':0,'Inglés':2,'Historia de España':0,'Historia de la Filosofía':2};
function migrateNivel(Sx){if(Sx.nivV>=1||!Sx.subjects)return;Sx.nivV=1;
 for(const s of Sx.subjects)if(s.name in NIVEL&&s.prep==null)s.prep=NIVEL[s.name];
 for(const w of Sx.works||[]){if(w.kind!=='exam'||w.auto==='review'||!(w.status==='pending'||w.status==='in_progress')||!(w.topics||[]).length)continue;const s=Sx.subjects.find(x=>x.id===w.subjectId),lv=s&&s.prep;if(!lv)continue;
  if(w.topics.every(t=>t.auto&&!(t.mastery>0)))w.topics=w.topics.map(t=>({...t,mastery:lv,selfRating:lv}))}}
function arrival(w,today){const st=studyOf(w),pl=S.blocks.filter(b=>b.workId===w.id&&b.status==='planned'&&b.date>=today&&b.date<=w.dueDate).reduce((a,b)=>a+b.end-b.start,0),rem=P.totalNeed(w),tot=st.min+rem,pct=st.min+pl>0?Math.round(100*st.min/(st.min+pl)):0;return{done:st.min,plan:pl,rem,tot,pct}}
function arrivalCard(){const td=now().date,ex=S.works.filter(w=>w.kind==='exam'&&w.auto!=='review'&&w.status!=='archived'&&w.status!=='done'&&w.dueDate>=td).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));if(!ex.length)return'';
 const rows=ex.map(w=>{const s=sub(w.subjectId),a=arrival(w,td);return`<div class=arr style="--c:${s.color}"><span class=an><i class=dot></i><b>${esc(s.name)}</b><small>${fd(w.dueDate)}</small></div><div class=ab><i style="width:${a.pct}%"></i></div><span class=at><b>${hr(a.done)}</b> hechas · <b>${hr(a.plan)}</b> previstas</span></div>`}).join('');
 return`<div class=card><h3>Horas hasta cada examen</h3><p class=m>Lo que has estudiado y lo que el calendario ya tiene previsto hasta el día del examen. La barra se llena a medida que estudias. Si cambias el nivel de una asignatura (Asignaturas → Editar), las horas se ajustan.</p>${rows}</div>`}
{const e=V.exa;V.exa=a=>{const h=e(a),c=arrivalCard();return c?h.replace(/(<div class=ph>[\s\S]*?<\/div>)/,m=>m+c):h}}
