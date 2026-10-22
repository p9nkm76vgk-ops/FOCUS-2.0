/* v19 · Rutina por días con total, Objetivos sin tabla vacía, Curso con estado vacío cuidado */
{const r=V.rut;if(r)V.rut=a=>{const h=r(a),k='<h2>Próximos 7 días</h2>',i=h.indexOf(k);if(i<0)return h;const n=now(),days=[...Array(7)].map((_,j)=>addDays(n.date,j));
 const tot=d=>S.blocks.filter(b=>b.date===d&&(b.status==='planned'||b.status==='done')).reduce((x,b)=>x+b.end-b.start,0)+(S.habit||[]).filter(x=>x.date===d&&(x.status==='planned'||x.status==='done')).reduce((x,b)=>x+b.end-b.start,0);
 const col=days.map(d=>`<section class="rday${d===n.date?' today':''}"><header class=rdh><b>${DOW[weekday(d)]}</b><span>${d.slice(8)}/${d.slice(5,7)}</span><em>${tot(d)?hr(tot(d)):'Libre'}</em></header>${dayItems(d)||'<p class=m>Sin sesiones.</p>'}</section>`).join('');
 return h.slice(0,i)+k+`<div class=rweek>${col}</div>`}}
{const o=V.obj;if(o)V.obj=a=>{ensureG(S);let h=o(a);if(S.goals.target==null&&!(S.grades||[]).length){h=h.replace(/<h2>[^<]*C[oó]mo vas[^<]*<\/h2>[\s\S]*?(?=<h2>Notas de esta|$)/i,'')}return h}}
{const c=V.cur;if(c)V.cur=a=>c(a).replace('<div class=card><h3>Falta la fecha de la PAU</h3>','<div class="card hero"><h3>Falta la fecha de la PAU</h3>')}
