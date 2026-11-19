(()=>{'use strict';
const $=s=>document.querySelector(s),V3=THREE.Vector3,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const stage=$('#stage'),legend=$('#legend'),legendList=$('#legendList'),cv=$('#gl'),tagsEl=$('#tags'),svg=$('#lines'),load=$('#loading'),pct=$('#pct'),msg=$('#msg'),tele=$('#tele'),play=$('#play'),bpmEl=$('#bpm'),bpmOut=$('#bpmOut');
const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const bi=(el,es,en,pre='')=>{el.textContent=pre+es;const s=document.createElement('span');s.className='x';s.textContent=' / '+en;el.append(s)}; // texto bilingüe
const CUT_OFFSET=0; // desplaza el plano de corte (unidades normalizadas; + deja más pared anterior)
const S={bpm:72,paused:false,t:0,view:'ext'};
const fail=t=>{load.hidden=true;msg.hidden=false;msg.textContent=t};
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){fail('Tu dispositivo no admite WebGL / WebGL not supported');return}
renderer.outputEncoding=THREE.sRGBEncoding;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
cv.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('Contexto gráfico perdido; recarga la página / Graphics context lost, reload')});

const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,100);
const controls=new THREE.OrbitControls(camera,cv);
Object.assign(controls,{enableDamping:true,dampingFactor:.08,enablePan:false,rotateSpeed:.8,zoomSpeed:.8});
scene.add(new THREE.HemisphereLight(0xdfe8ff,0x2a2018,.75));
const key=new THREE.DirectionalLight(0xfff2d6,1.15);key.position.set(2.5,3,3.5);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.5,far:14});key.shadow.bias=-.0004;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight(0x9db8ff,.45);fill.position.set(-3,1,2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,.4);rim.position.set(0,2,-4);scene.add(rim);
const shMat=new THREE.ShadowMaterial({opacity:.32});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,14),shMat);floor.rotation.x=-Math.PI/2;floor.position.y=-1.35;floor.receiveShadow=true;
const wall=new THREE.Mesh(new THREE.PlaneGeometry(14,9),shMat);wall.position.set(0,1.5,-2.2);wall.receiveShadow=true;
scene.add(floor,wall);

const plane=new THREE.Plane(new V3(0,0,-1),10); // conserva z <= constant
const rootExt=new THREE.Group(),rootCut=new THREE.Group();rootCut.visible=false;scene.add(rootExt,rootCut);
let ext=null,mixer=null,clipDur=1,cutReady=false,cutLoading=false,bones=[],items=[],cutTarget=new V3(),flows=[];
const gl=new THREE.GLTFLoader();
const track=x=>{if(x.lengthComputable)pct.textContent=Math.round(x.loaded/x.total*100)+'%'};

function prep(g,root,cut){const m=g.scene,b=new THREE.Box3().setFromObject(m),c=b.getCenter(new V3),s=2/Math.max(...b.getSize(new V3).toArray());
 m.scale.setScalar(s);m.position.copy(c).multiplyScalar(-s);root.add(m);
 m.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.frustumCulled=false;o.material.side=THREE.DoubleSide;
  if(cut){o.material.clippingPlanes=[plane];o.material.clipShadows=true}});
 root.updateMatrixWorld(true);return m}

gl.load('models/realistic_human_heart.glb',g=>{ext=prep(g,rootExt,false);load.hidden=true},track,()=>fail('No se pudo cargar el modelo / Model failed to load'));

function loadCut(done){if(cutLoading)return;cutLoading=true;load.hidden=false;pct.textContent='';
 gl.load('models/beating-heart.glb',g=>{const m=prep(g,rootCut,true);hbox=new THREE.Box3().setFromObject(rootCut);
  if(g.animations[0]){mixer=new THREE.AnimationMixer(m);clipDur=g.animations[0].duration;mixer.clipAction(g.animations[0]).play()}
  m.traverse(o=>{if(o.isBone&&!o.name.includes('endjnt'))bones.push(o)});
  const P=k=>{const v=new V3,t=new V3;let n=0;bones.forEach(b=>{if(b.name.includes(k)){v.add(b.getWorldPosition(t));n++}});return n?v.divideScalar(n):v};
  const mid=(a,b)=>()=>P(a).add(P(b)).multiplyScalar(.5);
  const RA=()=>P('right_atrium_jnt'),LA=()=>P('left_atrium_jnt'),TRI=()=>P('tricuspid_valve_jnt'),MIT=()=>P('mitral_valve_jnt'),PUL=()=>P('pulmonary_valve_jnt'),AOR=()=>P('aortic_valve_0');
  const RV=mid('tricuspid_valve_jnt','pulmonary_valve_jnt'),LV=mid('mitral_valve_jnt','aortic_valve_0');
  const W=(x,y,z)=>m.localToWorld(new V3(x,y,z)),k=m.scale.x; // coordenadas de escena -> mundo normalizado
  const ARCH=()=>W(.001,.16,.004),APEX=()=>{const v=W(.04,.01,.0173);v.z=Math.min(v.z,plane.constant);return v};
  const lerp=(p,q,t)=>()=>p().lerp(q(),t);
  // [grupo, español, inglés, posición]. Cámaras/válvulas: esqueleto del modelo. Vasos/estructuras: estimadas de la geometría (ver README)
  const defs=[
   ['cam','Aurícula derecha','Right atrium',RA],['cam','Aurícula izquierda','Left atrium',LA],['cam','Ventrículo derecho','Right ventricle',RV],['cam','Ventrículo izquierdo','Left ventricle',LV],
   ['val','Válvula tricúspide','Tricuspid valve',TRI],['val','Válvula mitral','Mitral valve',MIT],['val','Válvula pulmonar','Pulmonary valve',PUL],['val','Válvula aórtica','Aortic valve',AOR],
   ['ves','Vena cava superior','Superior vena cava',()=>W(-.032,.143,.003)],['ves','Aorta ascendente','Ascending aorta',lerp(AOR,ARCH,.5)],['ves','Arco aórtico','Aortic arch',ARCH],['ves','Tronco pulmonar','Pulmonary trunk',()=>PUL().add(new V3(0,.034*k,0))],
   ['est','Tabique interventricular','Interventricular septum',lerp(()=>RV().lerp(LV(),.5),APEX,.4)],['est','Ápex cardiaco','Cardiac apex',APEX],['est','Orejuela derecha','Right atrial appendage',()=>W(-.029,.115,.006)],['est','Orejuela izquierda','Left atrial appendage',()=>W(.031,.122,.008)]];
  const NS='http://www.w3.org/2000/svg',c=new V3;
  defs.forEach(([g,es,en,f],i)=>{const el=document.createElement('div'),bd=document.createElement('b'),sp=document.createElement('span'),e=document.createElement('i'),li=document.createElement('li'),lb=document.createElement('b'),sm=document.createElement('small');
   el.className='tag '+g;bd.textContent=i+1;e.className='en';e.textContent=' / '+en;sp.append(es,e);el.append(bd,sp);tagsEl.appendChild(el);
   const ln=document.createElementNS(NS,'line'),dot=document.createElementNS(NS,'circle');ln.setAttribute('class',g);dot.setAttribute('class',g);dot.setAttribute('r',4);svg.append(ln,dot);
   li.className=g;lb.textContent=i+1;sm.textContent=' / '+en;li.append(lb,es,sm);legendList.appendChild(li);
   items.push({el,ln,dot,li,g,f,tw:0,on:true});if(i<8)c.add(f())});
  c.divideScalar(8);legend.open=innerWidth>=520;
  const zc=[RA,LA,TRI,MIT,PUL,AOR].reduce((a,f)=>a+f().z,0)/6;
  plane.constant=zc+CUT_OFFSET;cutTarget.set(c.x,c.y,zc);
  flows=[[0x4f8cff,[RA,TRI,RV,PUL]],[0xff4d4d,[LA,MIT,LV,AOR]]].map(([col,fs])=>{
   const N=64,geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
   const p=new THREE.Points(geo,new THREE.PointsMaterial({color:col,size:.06,transparent:true,opacity:.95,depthWrite:false,clippingPlanes:[plane]}));
   p.frustumCulled=false;p.visible=false;p.userData={N,fs};scene.add(p);return p});
  cutReady=true;load.hidden=true;done()},track,()=>{cutLoading=false;fail('No se pudo cargar el corte / Cut model failed to load')})}

// cámara
let fit=6,zoomK=1,goal=null;const sph=new THREE.Spherical(),off=new V3;
const cur=()=>sph.setFromVector3(off.copy(camera.position).sub(controls.target));
controls.addEventListener('start',()=>{goal=null});
controls.addEventListener('change',()=>{zoomK=camera.position.distanceTo(controls.target)/fit});
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 const v=camera.fov*Math.PI/360,hf=Math.atan(Math.tan(v)*camera.aspect);
 const k=zoomK;fit=1.35/Math.sin(Math.min(v,hf));
 controls.minDistance=fit*.3;controls.maxDistance=fit*1.8;
 camera.position.copy(controls.target).add(off.copy(camera.position).sub(controls.target).setLength(k*fit));
 reflow()}
const D=Math.PI/180,POSE={ext:{th:65*D,ph:104*D,k:1},cut:{th:-10*D,ph:54*D,k:.7}},wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)); // vistas iniciales
function resetCam(){const c=S.view==='cut',p=POSE[S.view];zoomK=p.k;goal=null;controls.target.copy(c?cutTarget:new V3());
 camera.position.copy(controls.target).add(off.setFromSpherical(sph.set(fit*p.k,p.ph,p.th)));camera.lookAt(controls.target);controls.update()}
function nudge(dt,dp,f){const s=cur(),g=goal||{th:0,ph:s.phi,k:zoomK}; // th = ángulo que falta por girar (sin acumular vueltas)
 g.th+=dt;g.ph=clamp(g.ph+dp,controls.minPolarAngle,controls.maxPolarAngle);g.k=clamp(g.k*f,.3,1.8);goal=g}
new ResizeObserver(resize).observe(stage);resize();resetCam();

function setView(v){if(v==='cut'&&!cutReady){loadCut(()=>setView('cut'));return}
 S.view=v;const c=v==='cut';rootExt.visible=!c;rootCut.visible=c;tagsEl.toggleAttribute('hidden',!c);svg.toggleAttribute('hidden',!c);
 Object.assign(controls,{minAzimuthAngle:c?-1.25:-Infinity,maxAzimuthAngle:c?1.25:Infinity,minPolarAngle:c?.6:.1,maxPolarAngle:c?2.5:Math.PI-.1});
 flows.forEach(f=>f.visible=c);$('#groups').toggleAttribute('hidden',!c);legend.toggleAttribute('hidden',true);
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===v));resetCam();reflow()}
document.querySelector('header').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view)});

$('#groups').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;G=b.dataset.g;document.querySelectorAll('[data-g]').forEach(x=>x.setAttribute('aria-pressed',x===b));reflow()});
const ACT={rl:()=>nudge(.5,0,1),rr:()=>nudge(-.5,0,1),tu:()=>nudge(0,-.35,1),td:()=>nudge(0,.35,1),zi:()=>nudge(0,0,.8),zo:()=>nudge(0,0,1.25),rs:()=>{const p=POSE[S.view];goal={th:wrap(p.th-cur().theta),ph:p.ph,k:p.k}}};
$('.pad').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b)ACT[b.dataset.act]()});
const setPlay=()=>{bi(play,S.paused?'▶ Reanudar':'❚❚ Pausar',S.paused?'Resume':'Pause');play.setAttribute('aria-pressed',S.paused)};
play.addEventListener('click',()=>{S.paused=!S.paused;setPlay()});
const setBpm=()=>{bi(bpmOut,S.bpm+' lpm','bpm')};
bpmEl.addEventListener('input',()=>{S.bpm=+bpmEl.value;setBpm()});
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.ctrlKey||e.metaKey)return;
 const k={ArrowLeft:'rl',ArrowRight:'rr',ArrowUp:'tu',ArrowDown:'td','+':'zi','=':'zi','-':'zo','0':'rs'}[e.key];
 if(k){e.preventDefault();ACT[k]()}
 else if(e.key===' '&&e.target===document.body){e.preventDefault();play.click()}
 else if(e.key==='m'||e.key==='M')snd.click();
 else if(e.key==='Escape'&&S.view==='cut')setView('ext')});

// sonido sintetizado (Web Audio): sin archivos externos, desactivado por defecto
const snd=$('#snd');let ac=null,master=null,noise=null,sound=false,prevC=null;
function audioInit(){ac=new(window.AudioContext||window.webkitAudioContext)();const comp=ac.createDynamicsCompressor();master=ac.createGain();master.gain.value=1;master.connect(comp);comp.connect(ac.destination);
 noise=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
function thump(f,vol,dur){const t=ac.currentTime;[[1,1],[2,.6],[3.2,.3]].forEach(([m,v])=>{const o=ac.createOscillator(),g=ac.createGain();
 o.type=m===1?'sine':'triangle';o.frequency.setValueAtTime(f*m,t);o.frequency.exponentialRampToValueAtTime(f*m*.55,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol*v,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g).connect(master);o.start(t);o.stop(t+dur+.03)})}
function whoosh(vol,dur){const t=ac.currentTime+.04,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise;
 f.type='bandpass';f.Q.value=.8;f.frequency.setValueAtTime(220,t);f.frequency.linearRampToValueAtTime(620,t+dur*.45);f.frequency.linearRampToValueAtTime(240,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+dur*.35);g.gain.linearRampToValueAtTime(.0001,t+dur);
 s.connect(f).connect(g).connect(master);s.start(t);s.stop(t+dur+.05)}
const cross=(a,b,m)=>a<=b?(a<m&&b>=m):(a<m||b>=m);
function beats(a,b){if(cross(a,b,.08)){thump(85,1,.2);whoosh(S.view==='cut'?1.6:.9,Math.max(.1,.33*60/S.bpm))}if(cross(a,b,.3))thump(105,.75,.15)}
snd.addEventListener('click',()=>{try{if(!ac)audioInit();sound=!sound;if(sound){ac.resume();thump(85,1,.2);thump(105,.75,.15);whoosh(1.2,.3)}}catch(e){sound=false}
 snd.setAttribute('aria-pressed',sound);bi(snd,sound?'♪ Sonido: sí':'♪ Sonido',sound?'Sound: on':'Sound')});

// animación
const bump=(x,c,w)=>Math.exp(-(((x-c)/w)**2)),pulse=c=>bump(c,.08,.06)+.65*bump(c,.3,.07);
const tmp=new V3,clock=new THREE.Clock();let last='';
let G='all',L={pad:11,m:22,gh:24,sp:40},hbox=null;
function hx(w){let x0=1e9,x1=-1e9;const a=hbox.min,b=hbox.max; // extremos horizontales del corazón en pantalla
 for(let n=0;n<8;n++){const p=tmp.set(n&1?b.x:a.x,n&2?b.y:a.y,n&4?b.z:a.z).project(camera),x=(p.x+1)/2*w;x0=Math.min(x0,x);x1=Math.max(x1,x)}return[x0,x1]}
function reflow(){if(!cutReady||S.view!=='cut')return;
 const w=stage.clientWidth,h=stage.clientHeight,rem=parseFloat(getComputedStyle(document.documentElement).fontSize);
 const vis=items.filter(i=>G==='all'||i.g===G);
 items.forEach(i=>{i.on=vis.includes(i);i.el.hidden=i.li.hidden=!i.on;const d=i.on?'inline':'none';i.ln.setAttribute('display',d);i.dot.setAttribute('display',d)});
 const per=Math.max(1,Math.ceil(vis.length/2)),m=1.4*rem,pad=.7*rem,gh=1.5*rem,[x0,x1]=hx(w);let lvl='mini',sp=40;
 for(const l of(w<520?['mini']:['','noen','mini'])){tagsEl.className=l;let th=0,tw=0;
  vis.forEach(i=>{i.tw=i.el.offsetWidth;th=Math.max(th,i.el.offsetHeight);tw=Math.max(tw,i.tw)});
  sp=th*1.3;lvl=l;if(l==='mini'||(per*sp<=h-2*m&&2*(tw+gh)+(x1-x0)<=w-2*pad))break}
 Object.assign(L,{pad,m,gh,sp:Math.min(sp,(h-2*m)/per)});
 legend.toggleAttribute('hidden',lvl!=='mini')}
function layout(){const w=stage.clientWidth,h=stage.clientHeight,{pad,m,gh,sp}=L,vis=items.filter(i=>i.on),[x0,x1]=hx(w);
 vis.forEach(i=>{const p=i.f().project(camera);i.x=(p.x+1)/2*w;i.y=(1-p.y)/2*h});
 const s=vis.slice().sort((a,b)=>a.x-b.x),nl=Math.ceil(s.length/2);
 const place=(arr,left)=>{arr.sort((a,b)=>a.y-b.y);let p=-1e9;arr.forEach(i=>{i.ty=Math.max(i.y,p+sp,m);p=i.ty});
  let nx=h-m+sp;for(let k=arr.length-1;k>=0;k--){arr[k].ty=Math.min(arr[k].ty,nx-sp);nx=arr[k].ty}
  arr.forEach(i=>{const e=i.el.style,lx=left?clamp(x0-gh-i.tw,pad,w-pad-i.tw):clamp(x1+gh,pad,w-pad-i.tw),ex=left?lx+i.tw+2:lx-2;
   e.top=i.ty+'px';e.left=lx+'px';e.right='auto';
   i.ln.setAttribute('x1',ex);i.ln.setAttribute('y1',i.ty);i.ln.setAttribute('x2',i.x);i.ln.setAttribute('y2',i.y);i.dot.setAttribute('cx',i.x);i.dot.setAttribute('cy',i.y)})};
 place(s.slice(0,nl),true);place(s.slice(nl),false)}
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.1);
 if(!S.paused)S.t+=dt*S.bpm/60;const c=S.t%1;
 if(sound&&!S.paused&&prevC!==null)beats(prevC,c);prevC=c;
 if(goal){const s=cur(),a=rm?1:.16,dd=goal.th*a;s.theta+=dd;goal.th-=dd;s.phi+=(goal.ph-s.phi)*a;s.radius=fit*(zoomK+(goal.k-zoomK)*a);
  camera.position.copy(controls.target).add(off.setFromSpherical(s));camera.lookAt(controls.target);
  if(Math.abs(goal.th)+Math.abs(goal.ph-s.phi)+Math.abs(goal.k-zoomK)<.002)goal=null}
 controls.update();camera.updateMatrixWorld();
 if(S.view==='ext'){if(ext)rootExt.scale.setScalar(1+.045*pulse(c))}
 else if(cutReady){if(mixer)mixer.setTime(c*clipDur);rootCut.updateMatrixWorld(true);
  flows.forEach(f=>{const{N,fs}=f.userData,cv3=new THREE.CatmullRomCurve3(fs.map(g=>g())),a=f.geometry.attributes.position;
   for(let i=0;i<N;i++){cv3.getPoint((i/N+S.t*.6)%1,tmp);a.setXYZ(i,tmp.x+Math.sin(i*12.9)*.015,tmp.y+Math.sin(i*7.3)*.015,tmp.z+Math.sin(i*5.1)*.01)}
   a.needsUpdate=true});layout()}
 const t=c<.35?'Sístole / Systole':'Diástole / Diastole';if(t!==last){tele.textContent=t;last=t}
 renderer.render(scene,camera)}
setBpm();setPlay();frame();
})();
