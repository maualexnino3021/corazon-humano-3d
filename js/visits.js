(()=>{'use strict';
const box=document.getElementById('vis');if(!box)return;
const list=document.getElementById('visList'),tot=document.getElementById('visTotal'),yr=document.getElementById('visYear'),flag=document.getElementById('visFlag');
box.open=innerWidth>=700&&innerHeight>=760; // en pantallas pequeñas arranca plegado
const fmt=new Intl.NumberFormat();
const dn=l=>{try{return new Intl.DisplayNames([l],{type:'region'})}catch(e){return null}},es=dn('es'),en=dn('en');
const nm=(d,c)=>{try{return d?d.of(c):c}catch(e){return c}};
const note=t=>{list.replaceChildren();const li=document.createElement('li');li.className='empty';li.textContent=t;list.append(li)};
function render(d){
 yr.textContent=d.year;tot.textContent=fmt.format(d.total||0);flag.hidden=!(d.mem||d.demo);flag.textContent=d.demo?'DEMO':'PRUEBA / TEST';
 if(!d.top||!d.top.length){note('Aún sin datos por país / No country data yet');return}
 list.replaceChildren();const max=Math.max(1,...d.top.map(t=>t.n));
 d.top.slice(0,4).forEach((t,i)=>{const li=document.createElement('li'),k=document.createElement('b'),n=document.createElement('span'),c=document.createElement('em'),a=nm(es,t.c),b=nm(en,t.c);
  k.textContent=i+1;n.textContent=a;if(b&&b!==a){const x=document.createElement('span');x.className='x';x.textContent=' / '+b;n.append(x)}
  c.textContent=fmt.format(t.n);li.style.setProperty('--w',(t.n/max).toFixed(3));li.append(k,n,c);list.append(li)})}
async function run(){
 if(new URLSearchParams(location.search).has('demo')){render({year:new Date().getFullYear(),total:3120,top:[{c:'CO',n:1248},{c:'MX',n:612},{c:'ES',n:430},{c:'US',n:301}],demo:true});return}
 try{
  const r=await fetch('/api/visits',{method:'POST',cache:'no-store',credentials:'omit',keepalive:true}); // cada carga de página = 1 visita
  if(!r.ok)throw new Error(r.status);
  render(await r.json())}
 catch(e){tot.textContent='—';yr.textContent=new Date().getFullYear();note('Contador no disponible / Counter unavailable')}}
run();
})();
