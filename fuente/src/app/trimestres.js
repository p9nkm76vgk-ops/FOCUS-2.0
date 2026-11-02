/* v34 · Semanas de exámenes del 2.º y 3.er trimestre: exámenes PROVISIONALES copiados de la semana del 1.er trimestre (9–13 nov 2026), cada día de exámenes del 1.er trimestre se copia al día lectivo que ocupa el mismo lugar en la semana nueva (1.º→1.º, 2.º→2.º…; sábados y domingos no cuentan).
 * Aún no se sabe qué examen cae cada día: cuando se sepa, se edita la fecha o se elimina el examen. Los provisionales no se planifican hasta `planFrom` (el día siguiente a la semana de exámenes anterior)
 * ni mientras caigan fuera del horizonte; no alargan la pausa de entrenamiento ni disparan el «lo llevo yo» de otra asignatura. */
const TRIM=[{n:2,from:'2027-02-03',to:'2027-02-09',planFrom:'2026-11-14',label:'2.º trim.'},{n:3,from:'2027-05-07',to:'2027-05-13',planFrom:'2027-02-10',label:'3.er trim.'}],TRIM_SRC=['2026-11-09','2026-11-13'];
function triDays(t){const o=[];for(let x=t.from;x<=t.to;x=addDays(x,1)){const wd=weekday(x);if(wd>=1&&wd<=5)o.push(x)}return o}
function migrateTrimestres(Sx){if(Sx.triV>=2)return;const prev=Sx.triV||0;Sx.triV=2;if(!Array.isArray(Sx.works))return;
 if(prev===1)Sx.works=Sx.works.filter(w=>!(w.provisional&&/^tri\d:/.test(w.id)&&w.updatedAt===w.createdAt)); // v34 las colocó por día de la semana: se rehacen por orden (solo las que no has tocado)
 const src=Sx.works.filter(w=>w.kind==='exam'&&w.auto!=='review'&&!w.planFrom&&w.status!=='archived'&&w.dueDate>=TRIM_SRC[0]&&w.dueDate<=TRIM_SRC[1]&&!isUndated(w)),sd=[...new Set(src.map(w=>w.dueDate))].sort(),have=new Set(Sx.works.map(w=>w.id)),add=[];
 for(const t of TRIM){const td=triDays(t);for(const w of src){const k=sd.indexOf(w.dueDate),d=td[Math.min(k,td.length-1)];if(!d)continue;const id='tri'+t.n+':'+w.id;if(have.has(id))continue;
  const s=(Sx.subjects||[]).find(x=>x.id===w.subjectId),prep=Math.max(0,Math.min(3,+(s&&s.prep)||0)),title=(w.title||'Examen').replace(/\s*·\s*\d\.\S+ trim\.$/,'')+' · '+t.label,df=w.difficulty||3;
  let topics;try{topics=autoTopics([],w.amount||'normal',prep,df,true,title)}catch{topics=undefined}
  const now0=Date.now();add.push({id,kind:'exam',subjectId:w.subjectId,title,dueDate:d,dueMinute:w.dueMinute,difficulty:df,importance:w.importance||4,learn:w.learn,status:'pending',notes:'Examen provisional: copiado de la semana de exámenes del 1.er trimestre (mismo orden de días). Cambia la fecha o elimínalo cuando sepas qué examen cae cada día.',
   createdAt:now0,updatedAt:now0,pace:w.pace,calc:w.calc,goal:w.goal||'notable',amount:w.amount||'normal',topics,readiness:Math.round(prep/3*100),manualEstMin:undefined,autoEst:true,estMin:60,planFrom:t.planFrom,provisional:true})}}
 Sx.works=[...Sx.works,...add]}
