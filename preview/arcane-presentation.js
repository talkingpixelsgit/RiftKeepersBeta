/* Decorative only: no save, combat, RNG, focus or input routing changes. */
'use strict';
window.RKArcane=(()=>{
 const media=matchMedia('(prefers-reduced-motion: reduce)'), phone=matchMedia('(max-width:600px)');
 const layer=document.createElement('div');layer.id='rk-arcane';layer.setAttribute('aria-hidden','true');layer.inert=true;
 layer.innerHTML='<div class="rk-a-haze"></div><svg class="rk-a-streams" viewBox="0 0 1000 800" preserveAspectRatio="none"><defs><linearGradient id="rk-a-grad"><stop stop-color="#52e5e7"/><stop offset=".5" stop-color="#b773ff"/><stop offset="1" stop-color="#ffa869"/></linearGradient></defs><g fill="none" stroke="url(#rk-a-grad)">'+['M15 -40 C120 170 -70 280 30 450 S0 700 80 860','M985 -40 C850 190 1070 310 960 480 S1010 700 920 860','M-60 790 Q350 660 520 790 T1080 740'].map(d=>'<path class="rk-a-flow-bed" d="'+d+'"/><path class="rk-a-flow" d="'+d+'"/>').join('')+'</g></svg><div class="rk-a-seal"></div><div class="rk-a-motes">'+Array.from({length:16},(_,i)=>'<i style="--i:'+i+';left:'+(i%2?96-i%4:1+i%4)+'%;top:'+(8+i*17%84)+'%"></i>').join('')+'</div><div class="rk-a-event" hidden></div>';
 document.body.append(layer);
 let next=performance.now()+12000,until=0,event='',offline=false,dead=false;
 const reduced=()=>media.matches||SET.motion==='reduced';
 const busy=()=>!!(B||timingActive||guardActive||MG_ON||RUN||EXPLORING||travelling||window.RKParty?.active||window.RKControllerText?.active||document.querySelector('.overlay,.ask,.sheet'));
 const mode=()=>SET.arcaneMode||'full';
 const ready=()=>!!S?.arch&&!S.tut&&!document.querySelector('.first-light-art');
 const weatherOn=()=>SET.mapWeather!==false&&SET.weatherLens!==false;
 function clear(){event='';until=0;const el=layer.querySelector('.rk-a-event');el.hidden=true;el.replaceChildren();layer.removeAttribute('data-event');}
 function place(){
  const w=phone.matches?118:210,h=phone.matches?150:255;
  const boxes=[...document.querySelectorAll('button,input,select,textarea,a,summary,[role=button]')].filter(n=>!n.closest('#rk-arcane')&&n.getClientRects().length).map(n=>n.getBoundingClientRect());
  for(const y of [innerHeight-h-18,80,Math.max(90,innerHeight*.42-h/2)])for(const x of [innerWidth-w-8,8]){
   if(y+h>innerHeight-4)continue;
   if(boxes.some(b=>b.right>x&&b.left<x+w&&b.bottom>y&&b.top<y+h))continue;
   return {x,y,w,h};
  }return null;
 }
 function effect(kind){
  if(!['hand','rain','fire','lightning'].includes(kind)||!ready()||busy()||document.hidden||offline||reduced()||mode()!=='full'||event||kind!=='hand'&&!weatherOn())return false;
  const p=place();if(!p)return false;
  const el=layer.querySelector('.rk-a-event');el.style.cssText=`left:${p.x}px;top:${p.y-layer.getBoundingClientRect().top}px;width:${p.w}px;height:${p.h}px`;
  if(kind==='hand')el.innerHTML='<div class="rk-a-rift"></div><div class="rk-a-reach-shadow"></div><img class="rk-a-hand" src="preview/assets/arcane/reaching-gauntlet.png" alt=""><div class="rk-a-rift-lip"></div>';
  if(kind==='lightning')el.innerHTML='<svg class="rk-a-bolt" viewBox="0 0 180 250"><path d="M120 2 65 74 102 66 46 148 85 134 40 238 M87 90 150 112 130 160"/></svg><div class="rk-a-cloud"></div>';
  if(kind==='rain')el.innerHTML=Array.from({length:9},(_,i)=>'<i class="rk-a-drop" style="left:'+(8+i*10)+'%;--i:'+i+'"></i>').join('');
  if(kind==='fire')el.innerHTML='<div class="rk-a-flame"></div>'+Array.from({length:9},(_,i)=>'<i class="rk-a-ember" style="left:'+(8+i*10)+'%;--i:'+i+'"></i>').join('');
  event=kind;layer.dataset.event=kind;el.hidden=false;until=performance.now()+4800;return true;
 }
 function sync(){
  const on=ready()&&mode()!=='off',still=reduced()||mode()==='calm'||document.hidden||offline||busy();
  document.body.classList.toggle('rk-arcane-ui',on);layer.hidden=!on;layer.classList.toggle('rk-a-still',still);
  document.body.classList.toggle('rk-arcane-still',still||!on);
  if(!on||still||event!=='hand'&&!weatherOn())clear();
  if(event&&performance.now()>until)clear();
  if(on&&!still&&performance.now()>next){
   // A separate clock provides a visual cycle without consuming combat randomness.
   const kinds=weatherOn()?['hand','rain','lightning','fire']:['hand'];effect(kinds[Math.floor(performance.now()/45000)%kinds.length]);
   next=performance.now()+(phone.matches?55000:38000);
  }
 }
 function setMode(value){if(!['full','calm','off'].includes(value))return;SET.arcaneMode=value;saveSettings();clear();sync();render();}
 const oldSettings=settingsHTML;settingsHTML=function(){return oldSettings()+'<section class="admin-sec rk-a-settings"><h3>Living frame</h3><p>Pouring magic, sizzling edges and occasional rain, embers, lightning or a reaching hand. Large portal surprises rest during battles and dialogs. Layered magic and weather can continue around the controls; buttons and timing panels stay clear. Device reduced motion always wins.</p><div class="atmosphere-options">'+[['full','Living magic'],['calm','Still artwork'],['off','Off']].map(([id,name])=>'<button class="btn" data-arcane-mode="'+id+'" aria-pressed="'+(mode()===id)+'">'+name+'</button>').join('')+'</div></section>';};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-arcane-mode]');if(b)setMode(b.dataset.arcaneMode);});
 const oldRender=render;render=function(...args){const result=oldRender(...args);sync();return result;};
 const observer=new MutationObserver(()=>{if(busy())sync();});observer.observe(document.getElementById('main'),{childList:true,subtree:true});
 const interval=setInterval(()=>{if(!dead)sync();},250);
 document.addEventListener('visibilitychange',()=>{clear();next=performance.now()+12000;sync();});
 media.addEventListener('change',()=>{clear();sync();});
 addEventListener('resize',()=>{clear();sync();});addEventListener('offline',()=>{offline=true;clear();sync();});addEventListener('online',()=>{offline=false;sync();});
 addEventListener('pagehide',()=>{dead=true;clear();layer.classList.add('rk-a-still');});addEventListener('pageshow',()=>{dead=false;next=performance.now()+12000;sync();});
 sync();return {sync,effect,clear,setMode,get event(){return event;}};
})();
