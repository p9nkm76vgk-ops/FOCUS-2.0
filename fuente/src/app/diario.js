/* ===== Estudio diario hasta la PAU (v38): ningún día queda vacío. Todo el cálculo está en src/core/planner.ts (paso 3c); aquí solo se prepara el dato y se muestra la proyección. ===== */
/** Datos para el planificador: asignaturas con su peso (valor para la nota × lo que falta por dominar) y sus temas, de los menos dominados a los más. */
/** Horas por semana por asignatura (acordadas con el usuario el 3-nov-2026): periodo normal, se inclinan a +10 % ahora y -15 % hacia la PAU. */
const QUOTA_H={'Matemáticas II':3,'Business':3,'Física':3,'Química':3,'Lengua Castellana':3,'Catalán':3,'Historia de España':3,'Historia de la Filosofía':2,'Inglés':1};
/** Horas mínimas por asignatura y semana, ajustadas a lo que ya dominas (v49): con el temario casi todo en verde la cuota baja hasta el 40 % (queda un mantenimiento de ≥ 1 h)
 *  y esas horas pasan a las asignaturas menos dominadas, en proporción a lo que les falta × su valor. Sin temas apuntados no se toca nada. */
/** Modo secuencial (v54): una asignatura hasta que se domina (≥ 90 % de su temario en verde o «ya la domino»), y entonces la siguiente. Orden: el tuyo (goals.seqOrder) o por valor × lo que falta.
 *  Solo cuentan asignaturas con temas apuntados (sin temas no se puede medir). Si ninguna tiene temas o todas están dominadas, vuelve al reparto por cuotas. */
function seqInfo(Sx){const g=Sx.goals||{};if(!g.pauDate||g.dailyOff||g.seqOff||rotOn(Sx))return null;const subs=(Sx.subjects||[]).filter(s=>!s.archived),ord=g.seqOrder||[],DEF=[/filosof/i,/historia/i,/business|empresa/i,/lengua|castellan/i,/catal/i,/ingl/i,/qu[ií]m/i,/f[ií]sic/i,/mat/i],rank=r=>{const i=ord.indexOf(r.s.name);if(i>=0)return i;const d=DEF.findIndex(x=>x.test(r.s.name));return 100+(d<0?99:d)};
 const rows=subs.map(s=>({s,pm:GL.coverage(Sx.syllabus||[],s.id).pctMastery,w:GL.valueFactor(s.name)})).filter(r=>r.pm!=null);if(!rows.length)return null;
 rows.sort((a,b)=>rank(a)-rank(b)||b.w*(1.5-b.pm/100)-a.w*(1.5-a.pm/100)||a.s.name.localeCompare(b.s.name));
 const todo=rows.filter(r=>r.pm<90&&!(g.seqDone||{})[r.s.name]);return{cur:todo[0]||null,todo,rows}}
function quotaMap(Sx){if(rotOn(Sx)){const m=rotMap(Sx),o={};for(const s of Sx.subjects||[])if(!s.archived)o[s.id]=m[s.id]!=null?1500:0;return o}const sq=seqInfo(Sx);if(sq&&sq.cur){const o={};for(const s of Sx.subjects||[])if(!s.archived){if(s.id===sq.cur.s.id){o[s.id]=1500;continue}const r=sq.rows.find(x=>x.s.id===s.id),dom=r&&(r.pm>=90||(Sx.goals.seqDone||{})[r.s.name]);o[s.id]=dom?(/filosof|historia|business|empresa|lengua|castellan|catal|ingl/i.test(s.name)?60:30):0}return o}const g=Sx.goals||{},subs=(Sx.subjects||[]).filter(s=>!s.archived),r30=m=>Math.round(m/30)*30,o={},pm={},base={};let freed=0;
 for(const s of subs){const cv=GL.coverage(Sx.syllabus||[],s.id);pm[s.id]=cv.pctMastery==null?null:cv.pctMastery;base[s.id]=Math.round(60*((g.quotaH&&g.quotaH[s.name])??QUOTA_H[s.name]??2));
  const f=pm[s.id]!=null&&pm[s.id]>60?1-0.6*(pm[s.id]-60)/40:1;o[s.id]=f<1?Math.min(base[s.id],Math.max(60,r30(base[s.id]*f))):base[s.id];freed+=base[s.id]-o[s.id]}
 if(freed>0){let need=subs.filter(s=>o[s.id]===base[s.id]&&pm[s.id]!=null&&pm[s.id]<60);if(!need.length)need=subs.filter(s=>o[s.id]===base[s.id]&&pm[s.id]==null);
  const wt=Object.fromEntries(need.map(s=>[s.id,(1-(pm[s.id]||0)/100)*GL.valueFactor(s.name)])),got={};
  for(let u=Math.floor(freed/30);u>0&&need.length;u--){let best=null,bs=-1;for(const s of need){if((got[s.id]||0)>=60)continue;const sc=wt[s.id]/(1+(got[s.id]||0)/30);if(sc>bs){bs=sc;best=s}}if(!best)break;got[best.id]=(got[best.id]||0)+30;o[best.id]+=30}}
 return o}
function planDiario(Sx,today){const g=Sx.goals;if(!g||!g.pauDate||g.dailyOff||g.pauDate<today)return undefined;
 if(rotOn(Sx)){const m=rotMap(Sx),subs=(Sx.subjects||[]).filter(s=>!s.archived&&m[s.id]!=null);return{until:g.pauDate,from:g.startFrom||undefined,rot:true,wk:240,we:420,len:60,focus:true,subjects:subs.map(s=>{const ts=(Sx.syllabus||[]).filter(t=>t.subjectId===s.id).sort((a,b)=>a.mastery-b.mastery||String(a.next||'9').localeCompare(String(b.next||'9'))||a.name.localeCompare(b.name)),r=ROT_X.find(x=>x[0].test(s.name))||[];return{id:s.id,q:1500,w:1,days:[m[s.id]],ord:r[1]||0,dayMax:r[2]||undefined,noRev:!!r[3],topics:ts.map(t=>({id:t.id,name:t.name}))}})}}
 const QM=quotaMap(Sx),subs=(Sx.subjects||[]).filter(s=>!s.archived&&QM[s.id]>0);if(!subs.length)return undefined;
 return{until:g.pauDate,from:g.startFrom||undefined,wk:180,we:300,len:60,tilt:g.focusOff?[1.1,1]:[1,1],focus:!g.focusOff,subjects:subs.map(s=>{const ts=(Sx.syllabus||[]).filter(t=>t.subjectId===s.id).sort((a,b)=>a.mastery-b.mastery||String(a.next||'9').localeCompare(String(b.next||'9'))||a.name.localeCompare(b.name)),cv=GL.coverage(Sx.syllabus||[],s.id),pm=cv.pctMastery==null?0:cv.pctMastery;
  return{id:s.id,q:QM[s.id],cur:QM[s.id]>=1500,w:Math.round(100*GL.valueFactor(s.name)*(1.5-pm/100))/100,topics:ts.map(t=>({id:t.id,name:t.name}))}})}}
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

/* Cuotas mínimas semanales (v46): para una semana (lunes) cuenta hechas + previstas por asignatura y las compara con el mínimo acordado.
   Es lo que se ve de verdad en el calendario: si no cabe, se dice cuánto falta (nunca se finge que todo cabe). */
function quotaCheck(mon){const sqx=seqInfo(S);if(rotOn(S)||(sqx&&sqx.cur))return{rows:[],miss:0,total:0};const g=S.goals||{},QM=quotaMap(S),end=addDays(mon,6),wk=Object.fromEntries(S.works.map(w=>[w.id,w.subjectId])),have={};
 for(const b of S.blocks){if(b.date<mon||b.date>end||(b.status!=='planned'&&b.status!=='done'))continue;const id=b.subjectId||wk[b.workId];have[id]=(have[id]||0)+(b.end-b.start)}
 const rows=S.subjects.filter(x=>!x.archived).map(x=>{const q=QM[x.id]??0,h=have[x.id]||0;return{s:x,q,h,miss:Math.max(0,q-h)}});
 return{rows,miss:rows.reduce((t,r)=>t+r.miss,0),total:rows.reduce((t,r)=>t+r.q,0)}}

/* v51 · Revierte v50 (el usuario no quería ese cambio). Quien ya lo había recibido (fhV=1) recupera sus cuotas (Filosofía y Historia de España) y las sesiones de Filosofía dejan de estar fijas; se regenera el futuro una vez. */
function migrateFiloHist(Sx){if(Sx.fhV>=2)return false;const was=Sx.fhV===1;Sx.fhV=2;if(!was||!Sx.subjects)return false;const g=Sx.goals,fi=Sx.subjects.find(s=>s.name==='Historia de la Filosofía');if(!g)return false;
 if(g.quotaH){if(g.quotaH['Historia de la Filosofía']===0)delete g.quotaH['Historia de la Filosofía'];if(g.quotaH['Historia de España']===5)delete g.quotaH['Historia de España'];if(!Object.keys(g.quotaH).length)delete g.quotaH}
 const dw=Object.fromEntries((Sx.works||[]).map(w=>[w.id,w]));for(const b of Sx.blocks||[]){const w=dw[b.workId];if(w&&w.daily&&fi&&w.subjectId===fi.id&&b.status==='planned'&&b.manual)b.manual=false}
 return true}

/* v52 · Preferencia: tardes enteras a una sola asignatura (activada por defecto). Una vez, el futuro se regenera para que el plan ya hecho siga la preferencia. */
function migrateFocus(Sx){if(Sx.focV>=1)return false;Sx.focV=1;return !!(Sx.goals&&Sx.goals.pauDate)}
Object.assign(A,{focusToggle:()=>{ensureG(S);S.goals.focusOff=!S.goals.focusOff||undefined;if(!S.goals.focusOff)delete S.goals.focusOff;regenFuture();commit({quiet:true});toast(S.goals.focusOff?'Cada día mezcla asignaturas':'Tardes enteras a una sola asignatura')}});

/* v54 · Preferencia: una asignatura hasta dominarla (activada por defecto). Se regenera el futuro una vez. */
function migrateSeq(Sx){if(Sx.seqV>=1)return false;Sx.seqV=1;return !!(Sx.goals&&Sx.goals.pauDate)}
Object.assign(A,{seqToggle:()=>{ensureG(S);if(S.goals.seqOff)delete S.goals.seqOff;else S.goals.seqOff=true;regenFuture();commit({quiet:true});toast(S.goals.seqOff?'Reparto entre todas las asignaturas':'Una asignatura hasta dominarla')},
 seqNext:()=>{const q=seqInfo(S);if(!q||!q.cur)return;ensureG(S);S.goals.seqDone={...(S.goals.seqDone||{}),[q.cur.s.name]:true};regenFuture();commit({quiet:true});toast(q.cur.s.name+' dominada. Siguiente: '+((seqInfo(S)||{}).cur?seqInfo(S).cur.s.name:'reparto normal'))}});

/** v59 · Reinicio acordado (5 nov): el 1.er trimestre no cuenta. Se conservan notas, temario, asignaturas, ajustes, objetivos y rutina; se borran tareas, exámenes, sesiones e historial. El método nuevo empieza el sábado 14 nov. Una sola vez; copia de seguridad local. */
function migrateReset59(Sx){if(Sx.rstV>=1)return false;Sx.rstV=1;if(!Sx.subjects||!Array.isArray(Sx.blocks)||!(Sx.syllabus||[]).length)return false;
 try{localStorage.setItem('focusos.backup.pre59',JSON.stringify(Sx))}catch{}
 Sx.works=[];Sx.blocks=[];Sx.autopsies=[];Sx.deshacer={};Sx.errors=[];Sx.estimateLog=[];Sx.suggestionLog=[];Sx.explore={log:[]};Sx.warnOff={};
 if(Sx.refuerzo)Sx.refuerzo.on=false;if(Sx.goals){Sx.goals.startFrom='2026-11-14';delete Sx.goals.seqDone}return true}

/** v60 · Rotación semanal: cada asignatura tiene un día fijo (0=domingo … 6=sábado). Por defecto: Lun Catalán · Mar Historia · Mié Business · Jue Lengua · Vie Filosofía + Inglés · Sáb Física + Química · Dom Mates II. Editable en Ajustes. */
const ROT_D=[[/filosof/i,5],[/historia/i,2],[/catal/i,1],[/business|empresa/i,3],[/lengua|castellan/i,4],[/ingl/i,5],[/f[ií]sic/i,6],[/qu[ií]m/i,6],[/mat/i,0]];
const ROT_X=[[/ingl/i,0,45,true],[/filosof/i,1,150],[/f[ií]sic/i,0,210],[/qu[ií]m/i,1]]; // [nombre, orden en el día, minutos máx. ese día, sin repasos]
const DIAS7=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
function rotMap(Sx){const g=Sx.goals||{},dm=g.dayMap||{},o={};for(const s of Sx.subjects||[]){if(s.archived)continue;const d=dm[s.name]!=null?dm[s.name]:(ROT_D.find(x=>x[0].test(s.name))||[])[1];if(d!=null)o[s.id]=d}return o}
function rotOn(Sx){const g=Sx&&Sx.goals;return !!(g&&g.rot&&g.pauDate&&!g.dailyOff&&!g.rotOff&&Object.keys(rotMap(Sx)).length)}
function migrateRot(Sx){if(Sx.rotV>=1)return false;Sx.rotV=1;if(!(Sx.goals&&Sx.goals.pauDate))return false;Sx.goals.rot=true;return true}
function rotCard(){const m=rotMap(S),td=new Date(now().date+'T12:00:00Z').getUTCDay(),rows=[1,2,3,4,5,6,0].map(d=>{const ss=(S.subjects||[]).filter(s=>!s.archived&&m[s.id]===d);return`<div class="asr" ${d===td?'aria-current=date':''} style="--c:${ss[0]?ss[0].color:'var(--muted)'}"><i class=dot></i><b>${DIAS7[d].slice(0,3)}</b><span class=hrs>${ss.length?ss.map(x=>esc(x.name)).join(' + '):'libre'}</span></div>`}).join('');return`<div class="card bc"><div class=bch><div><small class=lab>Tu semana fija</small></div></div>${rows}</div>`}
{const a0=V.aj;V.aj=a=>a0(a)+(rotOn(S)?`<div class=card data-sec=dias><h3>Día de cada asignatura</h3><p class=m>Ese día se estudia solo esa asignatura. Toca para pasarla al día siguiente.</p>${(S.subjects||[]).filter(s=>!s.archived).map(s=>{const d=rotMap(S)[s.id];return`<div class=asr style="--c:${s.color}"><i class=dot></i><b>${esc(s.name)}</b><button class=lnk data-a=dayNext data-id="${s.id}">${d!=null?DIAS7[d]:'Sin día'}</button></div>`}).join('')}</div>`:'')}
Object.assign(A,{dayNext:t=>{const s=S.subjects.find(x=>x.id===t.dataset.id);if(!s)return;ensureG(S);const d=rotMap(S)[s.id],nx=d==null?1:(d+1)%7;S.goals.dayMap={...(S.goals.dayMap||{}),[s.name]:nx};regenFuture();commit({quiet:true});toast(s.name+': '+DIAS7[nx])}});
