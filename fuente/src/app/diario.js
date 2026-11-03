/* ===== Estudio diario hasta la PAU (v38): ningún día queda vacío. Todo el cálculo está en src/core/planner.ts (paso 3c); aquí solo se prepara el dato y se muestra la proyección. ===== */
/** Datos para el planificador: asignaturas con su peso (valor para la nota × lo que falta por dominar) y sus temas, de los menos dominados a los más. */
/** Horas por semana por asignatura (acordadas con el usuario el 3-nov-2026): periodo normal, se inclinan a +10 % ahora y -15 % hacia la PAU. */
const QUOTA_H={'Matemáticas II':3,'Business':3,'Física':3,'Química':3,'Lengua Castellana':3,'Catalán':3,'Historia de España':3,'Historia de la Filosofía':2,'Inglés':1};
function planDiario(Sx,today){const g=Sx.goals;if(!g||!g.pauDate||g.dailyOff||g.pauDate<today)return undefined;
 const subs=(Sx.subjects||[]).filter(s=>!s.archived);if(!subs.length)return undefined;
 return{until:g.pauDate,wk:180,we:300,len:60,tilt:[1.1,.85],subjects:subs.map(s=>{const ts=(Sx.syllabus||[]).filter(t=>t.subjectId===s.id).sort((a,b)=>a.mastery-b.mastery||String(a.next||'9').localeCompare(String(b.next||'9'))||a.name.localeCompare(b.name)),cv=GL.coverage(Sx.syllabus||[],s.id),pm=cv.pctMastery==null?0:cv.pctMastery;
  return{id:s.id,q:Math.round(60*((g.quotaH&&g.quotaH[s.name])??QUOTA_H[s.name]??2)),w:Math.round(100*GL.valueFactor(s.name)*(1.5-pm/100))/100,topics:ts.map(t=>({id:t.id,name:t.name}))}})}}
/** Un trabajo oculto por asignatura (auto:'review' + daily:true: ninguna pantalla lo lista como tarea). Idempotente. */
function syncDaily(Sx){const g=Sx.goals,on=planDiario(Sx,now().date),have=new Map((Sx.works||[]).filter(w=>w.daily).map(w=>[w.id,w])),want=new Set(on?on.subjects.map(u=>u.id):[]);let out=Sx.works;
 for(const sid of want){const id='daily:'+sid,w=have.get(id);
  if(!w)out=[...out,{id,kind:'task',subjectId:sid,title:'Estudio diario',dueDate:g.pauDate,estMin:45,manualEstMin:45,autoEst:false,difficulty:2,importance:3,readiness:0,status:'pending',auto:'review',daily:true,createdAt:0}];
  else if(w.status!=='pending'||w.dueDate!==g.pauDate)out=out.map(x=>x.id===id?{...x,status:'pending',dueDate:g.pauDate}:x)}
 for(const [id,w] of have)if(!want.has(id.slice(6))&&w.status==='pending')out=out.map(x=>x.id===id?{...x,status:'archived'}:x);
 return out}
/** Proyección: cuántas horas llevarías en todo el curso si cumples el plan actual hasta la PAU. Se calcula sobre una COPIA con horizonte hasta la PAU (no cambia tu plan). */
const MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
let PROJ=null;
function projectCourse(){const n=now(),g=S.goals;if(!g||!g.pauDate||g.pauDate<n.date)return null;const key=(S.version||0)+'|'+n.date+'|'+(g.dailyOff?1:0);if(PROJ&&PROJ.key===key)return PROJ.v;
 const X=JSON.parse(JSON.stringify(S)),days=Math.round((Date.parse(g.pauDate+'T00:00:00Z')-Date.parse(n.date+'T00:00:00Z'))/864e5)+1;X.settings.horizonDays=Math.max(X.settings.horizonDays,days);
 const r=scheduleOf(X,true),W=id=>X.works.find(w=>w.id===id)||{},byM={},byS={};let done=0,plan=0,daily=0,weeks=0;
 for(const b of r.blocks){const w=W(b.workId),m=b.date.slice(0,7);if(b.status==='done'){const v=b.actualMin??b.end-b.start;done+=v;(byM[m]??={d:0,p:0,y:0}).d+=v;byS[w.subjectId]=(byS[w.subjectId]||0)+v}
  else if(b.status==='planned'&&b.date>=n.date&&b.date<=g.pauDate){const v=b.end-b.start;plan+=v;if(w.daily)daily+=v;(byM[m]??={d:0,p:0,y:0})[w.daily?'y':'p']+=v;byS[w.subjectId]=(byS[w.subjectId]||0)+v}}
 weeks=Math.max(1,days/7);const v={done,plan,daily,total:done+plan,days,weeks,avg:Math.round((done+plan)/weeks),byM,byS};PROJ={key,v};return v}
function proyeccionCard(){const g=S.goals;if(!g||!g.pauDate)return'';const p=projectCourse();if(!p)return'';
 const ms=Object.keys(p.byM).sort(),mx=Math.max(60,...ms.map(m=>p.byM[m].d+p.byM[m].p+p.byM[m].y)),ss=Object.entries(p.byS).sort((a,b)=>b[1]-a[1]);
 const rows=ms.map(m=>{const x=p.byM[m],t=x.d+x.p+x.y;return`<div class=ro><span>${MESES[+m.slice(5)-1]} ${m.slice(2,4)}</span><b>${hr(t)}</b></div><div class=bar style="height:6px;margin:2px 0 8px"><i style="width:${Math.round(100*t/mx)}%"></i></div>`}).join('');
 return`<div class=card data-sec=proy><h3>Horas del curso hasta la PAU</h3><p class=m>Si cumples todo el plan tal como está hoy: <b>${hr(p.total)}</b> en total (${hr(p.done)} ya hechas + ${hr(p.plan)} previstas hasta el ${fd(g.pauDate)}), unas <b>${hr(p.avg)}</b> por semana. De las previstas, ${hr(p.daily)} son sesiones diarias de relleno que se irán cambiando por exámenes y tareas según los añadas.</p><p class=m>Es una proyección con tus datos de hoy (temas, exámenes y disponibilidad): crecerá cuando apuntes más exámenes o bajes algún tema a rojo.</p><details class=more><summary>Por mes y por asignatura</summary>${rows}<div style="height:8px"></div>${ss.map(([id,v])=>`<div class=ro><span><i class=dot style="--c:${sub(id).color}"></i> ${esc(sub(id).name)}</span><b>${hr(v)}</b></div>`).join('')}</details><div class=row style="justify-content:flex-start;margin-top:10px"><button data-a=dailyToggle>${g.dailyOff?'Activar':'Quitar'} las sesiones diarias de relleno</button></div></div>`}
A.dailyToggle=()=>{S.goals={...S.goals,dailyOff:!S.goals.dailyOff};PROJ=null;commit({quiet:true})};
{const c=V.cur;V.cur=a=>{const h=c(a);return h+proyeccionCard()}}
