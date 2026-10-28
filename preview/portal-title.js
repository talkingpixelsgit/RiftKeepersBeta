'use strict';
// The doorway is an optional title-screen toy. It never changes a save or grants loot.
window.RKTitlePortal=(()=>{
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 let host=null,timer=0,busy=false;
 const reduced=()=>SET.motion==='reduced'||SET.motion!=='full'&&media.matches;
 const paused=()=>SET.portalMotion===false||reduced()||document.hidden;
 function clear(){clearTimeout(timer);timer=0;busy=false;if(!host)return;host.querySelectorAll('[data-portal-effect]').forEach(n=>n.remove());host.removeAttribute('data-event');const b=host.querySelector('[data-portal-check]');if(b){b.removeAttribute('aria-disabled');b.removeAttribute('aria-busy');}}
 function motion(){if(!host)return;host.classList.toggle('rk-portal-still',paused());const b=host.querySelector('[data-portal-motion]');b.textContent=SET.portalMotion===false?'Resume portal motion':'Pause portal motion';b.setAttribute('aria-pressed',String(SET.portalMotion===false));if(paused())clear();}
 function effect(kind){
  if(!host?.isConnected||busy)return false;
  const result=host.querySelector('[data-portal-result]');
  const words={quiet:'Only a warm breeze. The doorway keeps its secrets.',rain:'A rain-soaked world brushes against this one.',blood:'A red echo from a battle far beyond the doorway.',burn:'A burning scroll slips through, then crumbles to ash.',companion:'A curious spirit darts past you and vanishes.'};
  if(!Object.hasOwn(words,kind))return false;
  result.textContent=words[kind];host.dataset.lastEvent=kind;
  // Paused/reduced-motion users get the same outcome through text, without a fly-in.
  if(paused()||kind==='quiet')return true;
  busy=true;const check=host.querySelector('[data-portal-check]');check.setAttribute('aria-disabled','true');check.setAttribute('aria-busy','true');host.dataset.event=kind;
  const layer=document.createElement('div');layer.dataset.portalEffect=kind;layer.setAttribute('aria-hidden','true');layer.className='rk-portal-event';
  if(kind==='rain'){
   layer.classList.add('rk-screen-weather','rain');
   for(let i=0;i<9;i++){const drop=document.createElement('i');drop.style.cssText=`left:${i<5?3+i*3:88+(i-5)*2}%;top:${5+i*8}%;--size:${9+i%4*3}px;--delay:${-i*.4}s`;layer.append(drop);}
  }else if(kind==='blood'){
   // Reuse the shipped blood sprite sheet with the existing 110x93 frame contract.
   for(let i=0;i<3;i++){const n=document.createElement('span');n.className='rk-portal-blood';n.style.cssText=`--blood-row:${i*93}px;left:${i===1?78:3+i*4}%;top:${20+i*19}%`;layer.append(n);}
  }else if(kind==='burn'){
   layer.classList.add('rk-screen-weather','fire');layer.innerHTML='<img class="rk-portal-scroll" src="rift-ui/icons/scroll.svg" alt=""><span class="rk-portal-scorch"></span>';
  }else{
   layer.innerHTML='<img class="rk-portal-visitor" src="art/souls/pipwisp.webp" alt="">';
  }
  host.querySelector('.rk-door-scene').append(layer);timer=setTimeout(clear,4200);return true;
 }
 function sync(){
  const next=document.querySelector('.first-light-art');
  if(next===host){motion();return;}clear();host=next;if(!host)return;
  host.classList.add('rk-portal-title');
  host.querySelector('.welcome-keeper')?.classList.add('rk-door-keeper');
  const scene=document.createElement('div');scene.className='rk-door-scene';scene.setAttribute('aria-hidden','true');
  scene.innerHTML='<div class="rk-door-landscape"></div><div class="rk-door-halo"></div><div class="rk-door-frame"><div class="rk-door-depth"></div><i></i><i></i><i></i></div><div class="rk-door-floor"></div><div class="rk-door-motes">'+Array.from({length:14},(_,i)=>`<i style="--i:${i};left:${10+i*6}%;top:${22+(i*19)%57}%"></i>`).join('')+'</div>';
  host.prepend(scene);
  host.querySelector(':scope>p')?.remove();
  const controls=document.createElement('div');controls.className='rk-portal-controls';
  controls.innerHTML='<span class="rk-portal-caption">SOME DOORS REMEMBER YOU</span><button type="button" data-portal-check>Check Mysterious Portal <span aria-hidden="true">✦</span></button><p data-portal-result role="status" aria-live="polite">A thousand worlds. Something stirs on the other side.</p><button type="button" data-portal-motion>Pause portal motion</button>';
  host.append(controls);
  controls.querySelector('[data-portal-check]').onclick=()=>{if(busy)return;const r=Math.random();effect(r<.3?'quiet':r<.5?'rain':r<.65?'blood':r<.8?'burn':'companion');};
  controls.querySelector('[data-portal-motion]').onclick=()=>{SET.portalMotion=SET.portalMotion===false;saveSettings();motion();};
  motion();
 }
 const original=render;render=function(...args){const r=original(...args);sync();return r;};
 addEventListener('visibilitychange',()=>{clear();motion();});addEventListener('pagehide',clear);media.addEventListener('change',motion);
 sync();return {sync,clear,effect};
})();
