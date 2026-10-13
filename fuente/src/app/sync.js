/* Sincronización entre dispositivos (Supabase: inicio de sesión + una fila por usuario con RLS).
   Instantánea completa con versión: se sube con control de concurrencia (focus_push) y, si otro dispositivo cambió antes, se pregunta. Sin dependencias.
   La clave «publishable» es pública por diseño; los datos los protege RLS (cada usuario solo ve su fila). Los tokens de sesión NO forman parte de los datos ni de las exportaciones. */
const SB={url:'https://bcdvhnfepscguihmfjma.supabase.co',key:'sb_publishable_exwySppcfwvyjHzL2pL7ww_QY-pzDmS'},SYK='focusos.sync',SYBAK='focusos.v1.syncbackup';
const SY=(()=>{
 let st={session:null,base:0,dirty:false,last:0,sig:''},timer=null,busy=false,err='',asked=false,lastTry=0;
 try{const x=JSON.parse(localStorage.getItem(SYK)||'{}');st={session:x.session||null,base:+x.base||0,dirty:!!x.dirty,last:+x.last||0,sig:x.sig||''}}catch{}
 const save=()=>{try{localStorage.setItem(SYK,JSON.stringify(st))}catch{}};
 const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+s.length};
 const sigOf=()=>hash(JSON.stringify({...S,version:0}));
 const device=()=>{try{const u=navigator.userAgent||'';return /iPad/.test(u)?'iPad':/iPhone/.test(u)?'iPhone':'web'}catch{return'web'}};
 const note=()=>{try{typeof route!=='undefined'&&route==='aj'&&!CHOOSING&&render()}catch{}};
 const ES=m=>({'Invalid login credentials':'Correo o contraseña incorrectos.','Email not confirmed':'Confirma primero el correo (revisa tu bandeja y el spam) y vuelve a entrar.','User already registered':'Ese correo ya tiene cuenta: inicia sesión.','over_email_send_rate_limit':'Demasiados correos seguidos: espera unos minutos.','invalid_credentials':'Correo o contraseña incorrectos.','email_not_confirmed':'Confirma primero el correo (revisa tu bandeja y el spam) y vuelve a entrar.','user_already_exists':'Ese correo ya tiene cuenta: inicia sesión.','weak_password':'La contraseña es demasiado débil: usa al menos 8 caracteres.'}[m]||(/rate limit/i.test(m)?'Demasiados intentos: espera unos minutos.':/Password should be/i.test(m)?'La contraseña debe tener al menos 8 caracteres.':/Failed to fetch|NetworkError|Load failed/i.test(m)?'Sin conexión.':m));
 async function api(path,opt,tok){const r=await fetch(SB.url+path,{...opt,headers:{apikey:SB.key,'Content-Type':'application/json',Authorization:'Bearer '+(tok||SB.key),...(opt&&opt.headers)}});let j=null;try{j=await r.json()}catch{}
  if(!r.ok)throw Object.assign(new Error(ES((j&&(j.error_code||j.msg||j.error_description||j.message||j.error))||('HTTP '+r.status))),{status:r.status});return j}
 const setSession=j=>{st.session={access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(+j.expires_in||3600)*1000,email:(j.user&&j.user.email)||(st.session&&st.session.email)||''};save()};
 async function token(){const s=st.session;if(!s)throw new Error('Sin sesión.');if(s.exp-60000>Date.now())return s.access;
  try{setSession(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh})}));return st.session.access}catch(e){if(e.status===400||e.status===401||e.status===403){st.session=null;save();throw new Error('La sesión caducó: vuelve a iniciar sesión.')}throw e}}
 const summary=d=>{const w=(d&&d.works)||[],b=(d&&d.blocks)||[];return `${w.length} tareas y exámenes · ${b.filter(x=>x.status==='done').length} sesiones hechas`};
 const emptyLocal=()=>!S.works.length&&!S.blocks.length&&!(S.grades||[]).length&&!(S.goals&&S.goals.subjTarget&&Object.keys(S.goals.subjTarget).length);
 async function adopt(rem){const mine=localStorage.getItem(KEY);try{if(mine)localStorage.setItem(SYBAK,mine)}catch{}
  const d=JSON.parse(JSON.stringify(rem.data));d.version=storedVer()+1;localStorage.setItem(KEY,JSON.stringify(d));const r=await repo.load();
  if(r.error||!r.state){try{mine?localStorage.setItem(KEY,mine):localStorage.removeItem(KEY)}catch{}err='Los datos de la nube no son válidos; se conservan los de este dispositivo.';return false}
  S=r.state;LAST=JSON.stringify(S);st.base=rem.version;st.dirty=false;st.sig=sigOf();save();render();toast('Datos actualizados desde la nube');return true}
 async function ask(rem,tok){if(asked)return;asked=true;
  choose('Los datos son distintos en este dispositivo y en la nube',`<p class=m>Nube: ${esc(summary(rem.data))}.<br>Este dispositivo: ${esc(summary(S))}.<br>La versión que descartes se guarda como copia de seguridad en este dispositivo.</p>`,[
   {l:'Usar la nube',c:'pri',fn:()=>{asked=false;adopt(rem).then(note)}},{l:'Usar este dispositivo',fn:()=>{asked=false;try{localStorage.setItem(SYBAK,JSON.stringify(rem.data))}catch{}st.base=rem.version;st.dirty=true;save();sync({force:true})}},{l:'Decidir luego',fn:()=>{}}])}
 async function push(tok){const snap=JSON.parse(JSON.stringify(S)),sg=sigOf();
  const r=await api('/rest/v1/rpc/focus_push',{method:'POST',body:JSON.stringify({p_data:snap,p_base:st.base,p_device:device()})},tok),x=Array.isArray(r)?r[0]:r;
  if(x&&x.ok){st.base=+x.version;st.sig=sg;st.dirty=sigOf()!==sg;save();return true}return false}
 async function sync(o){o=o||{};if(!st.session||busy||typeof fetch!=='function')return;if(!o.force&&Date.now()-lastTry<10000)return;lastTry=Date.now();busy=true;err='';note();
  try{const tok=await token();const rows=await api('/rest/v1/focus_state?select=data,version&limit=1',{method:'GET'},tok),rem=rows&&rows[0];
   if(!rem){if(!(await push(tok)))err='No se pudo subir; se reintentará.'}
   else if(rem.version===st.base){if(st.dirty&&!(await push(tok)))err='Otro dispositivo cambió datos a la vez; vuelve a sincronizar.'}
   else if((!st.dirty&&st.base>0)||emptyLocal())await adopt(rem);
   else await ask(rem,tok);
   if(!err)st.last=Date.now();save()}
  catch(e){err=ES(e.message||'Error de sincronización')}finally{busy=false;note()}}
 const schedule=()=>{if(timer||!st.session)return;try{timer=setTimeout(()=>{timer=null;sync({force:true})},2000)}catch{}};
 return{
  get on(){return!!st.session},get email(){return st.session?st.session.email:''},get base(){return st.base},get dirty(){return st.dirty},
  status(){if(!st.session)return'';if(busy)return'Sincronizando…';if(err)return err;if(st.dirty)return'Cambios pendientes de subir';return st.last?'Sincronizado a las '+new Date(st.last).toTimeString().slice(0,5):'Sin sincronizar todavía'},
  /** Llamar tras guardar: marca pendiente solo si los datos cambiaron de verdad desde la última sincronización. */
  touch(){if(!st.session)return;const d=sigOf()!==st.sig;if(d!==st.dirty){st.dirty=d;save()}if(d)schedule()},
  sync,flush:()=>sync({force:true}),
  init(){if(typeof document==='undefined')return;try{document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});window.addEventListener('online',()=>sync({force:true}))}catch{}sync({force:true})},
  async signIn(email,pw){const j=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password:pw})});setSession(j);st.base=0;st.dirty=true;st.sig='';save();await sync({force:true})},
  async signUp(email,pw){const j=await api('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password:pw})});if(j&&j.access_token){setSession(j);st.base=0;st.dirty=true;st.sig='';save();await sync({force:true});return{confirm:false}}return{confirm:true}},
  signOut(){st.session=null;st.base=0;st.dirty=false;st.sig='';err='';save();note()},
  _state:()=>st}})();
const syncCard=()=>{const on=SY.on;return`<div class=card><h3>Cuenta y sincronización</h3>`+(on?`<p class=m>Sesión: <b>${esc(SY.email)}</b><br>${esc(SY.status())}</p><p class=m>Entra con esta misma cuenta en el móvil y en el iPad: los datos se mantienen iguales. Sin conexión sigue funcionando y se sube al volver.</p><div class=row><button data-a=syncNow>Sincronizar ahora</button><button class=danger data-a=syncOut>Cerrar sesión</button></div>`:
 `<p class=m>Con una cuenta, tus datos se guardan también en la nube y se comparten entre el móvil y el iPad. Sin cuenta, todo sigue guardado solo en este dispositivo.</p><div id=authf><label>Correo<input name=email type=email autocomplete=username inputmode=email></label><label>Contraseña (mín. 8)<input name=pw type=password autocomplete=current-password minlength=8></label><p class=m id=autherr role=status></p><div class=row><button class=pri data-a=syncIn>Iniciar sesión</button><button data-a=syncUp>Crear cuenta</button></div></div>`)+`</div>`};
{const aj2=V.aj;V.aj=a=>aj2(a).replace('<h1>Ajustes</h1>','<h1>Ajustes</h1>'+syncCard())}
{const authVals=()=>{const f=$('#authf');return f?{email:(f.querySelector('[name=email]').value||'').trim(),pw:f.querySelector('[name=pw]').value||''}:{email:'',pw:''}},
 msg=m=>{const e=$('#autherr');e?e.textContent=m:toast(m)},
 check=v=>!/^\S+@\S+\.\S+$/.test(v.email)?'Escribe un correo válido.':v.pw.length<8?'La contraseña debe tener al menos 8 caracteres.':null;
 Object.assign(A,{syncIn:async()=>{const v=authVals(),e=check(v);if(e)return msg(e);msg('Entrando…');try{await SY.signIn(v.email,v.pw);render()}catch(x){msg(x.message)}},
  syncUp:async()=>{const v=authVals(),e=check(v);if(e)return msg(e);msg('Creando cuenta…');try{const r=await SY.signUp(v.email,v.pw);r.confirm?msg('Cuenta creada. Te hemos enviado un correo: confírmalo y luego pulsa «Iniciar sesión».'):render()}catch(x){msg(x.message)}},
  syncNow:()=>SY.sync({force:true}),syncOut:()=>{if(confirm('¿Cerrar sesión? Los datos de este dispositivo se conservan y dejan de sincronizarse.'))SY.signOut()}})}
