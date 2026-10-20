/* Horario de clases: una línea por clase («08:00-08:55 Matemáticas II»). Se guarda en el estado (S.timetable) y se exporta al Calendario con aviso 10 min antes. */
const TT={
 line:/^(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})\s+(\S.*)$/,
 parse(txt,day){const out=[];let n=0;for(const raw of String(txt||'').split('\n')){const l=raw.trim();if(!l)continue;n++;const m=TT.line.exec(l);if(!m)return{err:`${DOW[day]}, línea ${n}: usa «08:00-08:55 Asignatura».`};
  const s=+m[1]*60+ +m[2],e=+m[3]*60+ +m[4];if(+m[1]>23||+m[3]>23||+m[2]>59||+m[4]>59||e<=s)return{err:`${DOW[day]}, línea ${n}: la hora de fin debe ser posterior a la de inicio.`};
  out.push({id:`c${day}-${s}`,day,start:s,end:e,name:m[5].trim().slice(0,60)})}
  for(let i=1;i<out.length;i++){const a=[...out].sort((x,y)=>x.start-y.start);for(let j=1;j<a.length;j++)if(a[j].start<a[j-1].end)return{err:`${DOW[day]}: «${a[j-1].name}» y «${a[j].name}» se solapan.`}}
  return{list:out}},
 text:day=>(S.timetable||[]).filter(c=>c.day===day).sort((a,b)=>a.start-b.start).map(c=>`${fm(c.start)}-${fm(c.end)} ${c.name}`).join('\n'),
 next(n){const t=S.timetable||[];if(!t.length)return null;for(let k=0;k<8;k++){const d=addDays(n.date,k),wdn=weekday(d);const c=t.filter(x=>x.day===wdn&&(k>0||x.start>n.minute)).sort((a,b)=>a.start-b.start)[0];if(c)return{...c,date:d,k}}return null},
 card(){const days=[1,2,3,4,5];return`<div class=card><h3>Horario de clases</h3><p class=m>Una clase por línea, por ejemplo <b>08:00-08:55 Matemáticas II</b>. Con tu horario guardado, el archivo del Calendario incluye cada clase con un aviso <b>10 min antes</b>, así no tienes que mirar el horario.</p>${days.map(d=>`<label class=m for=tt${d}>${['','Lunes','Martes','Miércoles','Jueves','Viernes'][d]}</label><textarea id=tt${d} rows=${Math.max(3,TT.text(d).split('\n').length+1)} style="width:100%;margin-bottom:8px" placeholder="08:00-08:55 Matemáticas II">${esc(TT.text(d))}</textarea>`).join('')}<div class=row style="justify-content:flex-start"><button class=pri data-a=ttSave>Guardar horario</button><button data-a=icsAsk>Descargar avisos para el Calendario</button></div><p class=m id=ttMsg></p></div>`}};
{const aj3=V.aj;V.aj=a=>aj3(a).replace('<h1>Ajustes</h1>','<h1>Ajustes</h1>'+TT.card())}
Object.assign(A,{ttSave:()=>{const all=[];for(const d of [1,2,3,4,5]){const el=document.getElementById('tt'+d),r=TT.parse(el?el.value:'',d);if(r.err){const m=document.getElementById('ttMsg');if(m)m.textContent=r.err;return toast(r.err)}all.push(...r.list)}
 S.timetable=all;commit({quiet:true});toast(all.length?`Horario guardado: ${all.length} clases`:'Horario vacío')}});
