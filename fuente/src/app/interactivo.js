/* ===== v43 · Gráficas interactivas: pasar el dedo/ratón por encima (o arrastrar) muestra el valor exacto, una guía y el punto resaltado ===== */
const CT=(()=>{let tip=null,cur=null,guide=null,hot=null,down=false;
 const mk=()=>{if(tip)return tip;tip=document.createElement('div');tip.id='ctip';tip.setAttribute('role','status');document.body.appendChild(tip);return tip};
 const txt=el=>{const t=el.querySelector&&el.querySelector('title');if(t){el.dataset.t=t.textContent;t.remove()}return el.dataset.t||''};
 const clear=()=>{if(tip)tip.classList.remove('on');if(guide){guide.remove();guide=null}if(hot){hot.classList.remove('hot');hot=null}cur=null};
 const svgX=(svg,e)=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())};
 function show(svg,e){let el=null,label='',cx=null;
  if(svg.classList.contains('donut')){el=e.target.closest&&e.target.closest('circle.dn');if(!el)return clear();label=txt(el);if(hot&&hot!==el)hot.classList.remove('hot');hot=el;el.classList.add('hot')}
  else{const x=svgX(svg,e).x;
   const pts=[...svg.querySelectorAll('circle.dt')];
   if(pts.length){let b=null,bd=1e9;for(const c of pts){const d=Math.abs(+c.getAttribute('cx')-x);if(d<bd){bd=d;b=c}}el=b;label=txt(b);cx=+b.getAttribute('cx');
    if(!guide){guide=document.createElementNS('http://www.w3.org/2000/svg','line');guide.setAttribute('class','guide');svg.insertBefore(guide,svg.querySelector('.ma'))}
    guide.setAttribute('x1',cx);guide.setAttribute('x2',cx);guide.setAttribute('y1',10);guide.setAttribute('y2',+svg.querySelector('line.gl.z')?.getAttribute('y1')||170);
    if(hot&&hot!==b)hot.classList.remove('hot');hot=b;b.classList.add('hot')}
   else{const gs=[...svg.querySelectorAll('g')].filter(g=>g.querySelector('rect')||g.querySelector('title')||g.dataset.t);let b=null,bd=1e9;for(const g of gs){const r=g.querySelector('rect');if(!r)continue;const c=+r.getAttribute('x')+(+r.getAttribute('width'))/2,d=Math.abs(c-x);if(d<bd){bd=d;b=g}}
    if(!b)return clear();el=b;label=txt(b);if(hot&&hot!==b)hot.classList.remove('hot');hot=b;b.classList.add('hot')}}
  if(!label)return clear();cur=el;const t=mk();const[a,...r]=label.split(': ');t.innerHTML=r.length?`<small>${esc(a)}</small><b>${esc(r.join(': '))}</b>`:`<b>${esc(label)}</b>`;t.classList.add('on');
  const w=t.offsetWidth,h=t.offsetHeight;let left=e.clientX-w/2,top=e.clientY-h-18;left=Math.max(8,Math.min(innerWidth-w-8,left));if(top<8)top=e.clientY+22;t.style.left=left+'px';t.style.top=top+'px'}
 const on=(e)=>{const svg=e.target.closest&&e.target.closest('svg.chart,svg.donut');if(!svg){if(!down)clear();return}show(svg,e)};
 document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&!down)return;on(e)});
 document.addEventListener('pointerdown',e=>{down=true;on(e)});
 document.addEventListener('pointerup',e=>{down=false;if(e.pointerType==='touch')setTimeout(clear,1400)});
 document.addEventListener('pointercancel',()=>{down=false;clear()});
 document.addEventListener('pointerleave',clear,true);
 document.addEventListener('scroll',clear,{passive:true,capture:true});
 return{clear}})();
