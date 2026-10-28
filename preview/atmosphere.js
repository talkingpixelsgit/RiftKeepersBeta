/* Browser adaptation of Rain-006 readability rules and its CC0 particle textures.
   Weather is presentation only; ability cues start after resolution, never on selection. */
'use strict';
window.RKAtmosphere=(()=>{
 let effect=null,scene=null,layer=null,screen=null,frame=0,expiry=0,scope='',portalTimer=0,lastTime=0,offline=false;
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const smoke=new Image();smoke.src='preview/assets/weather/smoke.png';
 const light=new Image();light.src='preview/assets/weather/light.png';
 const reduced=()=>SET.motion==='reduced'||(SET.motion!=='full'&&media.matches);
 const enabled=()=>SET.mapWeather!==false&&!document.hidden&&!offline;
 const phase=()=>!S?.arch?'title':B?'solo:'+S.loc:view==='fellowship'&&RKParty.active?'party:'+RKParty.match.id:view==='hunt'?'map:'+S.loc:'none';
 function clear(){cancelAnimationFrame(frame);frame=0;clearTimeout(expiry);expiry=0;effect=null;lastTime=0;layer?.remove();layer=null;scene?.classList.remove('rk-wet','rk-burnt','rk-frost','rk-magic','rk-dust');scene=null;screen?.remove();screen=null;}
 function surface(){return document.querySelector(view==='fellowship'?'.expedition-stage':B?'.scene.battle':'.location-art');}
 function baseline(){if(view==='fellowship'&&RKParty.active&&RKParty.connected)return 'rain';if(view==='hunt'&&!B)return ['shallows','fen','tidew'].includes(S.loc)?'rain':['peaks'].includes(S.loc)?'frost':null;return null;}
 function sync(){
  document.body.classList.toggle('rk-page-hidden',document.hidden);
  document.body.classList.toggle('rk-reduced',reduced());document.body.classList.toggle('rk-full-motion',SET.motion==='full');
  const next=phase();if(scope!==next){clear();scope=next;}
  if(!enabled()||next==='none'||next==='title'||document.querySelector('.overlay,.ask,.sheet')||(view==='fellowship'&&!RKParty.connected)){clear();return;}
  const host=surface();if(!host){clear();return;}
  if(scene!==host){if(scene)scene.classList.remove('rk-wet','rk-burnt','rk-frost','rk-magic','rk-dust');layer?.remove();scene=host;layer=document.createElement('canvas');layer.className='rk-weather-canvas';layer.setAttribute('aria-hidden','true');host.appendChild(layer);}
  if(!effect&&baseline())effect={kind:baseline(),until:Infinity};
  paintClass();if(effect&&!frame)frame=requestAnimationFrame(draw);
 }
 function paintClass(){if(!scene)return;for(const [kind,cls] of Object.entries({rain:'rk-wet',fire:'rk-burnt',frost:'rk-frost',spirit:'rk-magic',earth:'rk-dust'}))scene.classList.toggle(cls,effect?.kind===kind);
  const lens=effect&&SET.weatherLens!==false&&!reduced();
  if(lens&&screen?.parentElement===scene&&screen.classList.contains(effect.kind))return;
  screen?.remove();screen=null;
  if(effect&&SET.weatherLens!==false&&!reduced()){
   screen=document.createElement('div');screen.className='rk-screen-weather '+effect.kind;screen.setAttribute('aria-hidden','true');scene.appendChild(screen);
   if(effect.kind==='rain')for(let i=0;i<7;i++){const d=document.createElement('i');d.style.cssText=`left:${i%2?94-(i*3)%9:2+(i*7)%9}%;top:${(i*19+8)%85}%;--delay:${-i*.7}s;--size:${6+i%3*3}px`;screen.appendChild(d);}
  }
 }
 function ability(element){if(!enabled()||phase()==='none'||phase()==='title')return;
  const kind=({storm:'rain',lightning:'rain',water:'rain',ice:'frost',fire:'fire',spirit:'spirit',ki:'spirit',void:'spirit',dark:'spirit',earth:'earth'})[element];if(!kind)return;
  sync();if(!scene)return;effect={kind,until:performance.now()+10000};paintClass();clearTimeout(expiry);expiry=setTimeout(()=>{clear();sync();},10000);if(!frame)frame=requestAnimationFrame(draw);
 }
 function draw(time){frame=0;if(!scene?.isConnected||!enabled()){clear();return;}const ctx=layer.getContext('2d');if(!ctx)return;
  const w=scene.clientWidth,h=scene.clientHeight,dpr=Math.min(devicePixelRatio||1,1.5);if(layer.width!==Math.round(w*dpr)||layer.height!==Math.round(h*dpr)){layer.width=Math.round(w*dpr);layer.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(!effect||reduced())return;
  // Rain-006 density budget: at most fourteen close particles, no screen-space ground splashes.
  const t=time/1000,kind=effect.kind,fade=effect.until===Infinity?1:Math.min(1,Math.max(0,(effect.until-time)/1800));ctx.globalAlpha=fade;if(screen)screen.style.opacity=String(fade);
  for(let i=0;i<14;i++){const depth=.45+(i*.317)%.55,x=((i*.6180339887%1)*w+t*20*depth)%w,y=(((i*.4142135623%1)*h+t*(kind==='rain'?420:kind==='fire'?-65:kind==='frost'?28:-12)*depth)%h+h)%h;
   if(kind==='rain'){ctx.strokeStyle='rgba(174,209,235,.30)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4*depth,y+24*depth);ctx.stroke();}
   else{ctx.fillStyle=kind==='fire'?'rgba(255,110,38,.6)':kind==='frost'?'rgba(220,239,255,.45)':kind==='earth'?'rgba(189,160,120,.3)':'rgba(173,140,232,.4)';ctx.beginPath();ctx.arc(x,y,kind==='frost'?2.1:1.4,0,Math.PI*2);ctx.fill();}
  }
  if(kind==='fire'&&smoke.complete&&smoke.naturalWidth){for(let i=0;i<3;i++){const p=(t*.09+i*.31)%1;ctx.globalAlpha=.08*Math.sin(p*Math.PI)*fade;ctx.drawImage(smoke,w*(.75+i*.06)-45,h*(.83-p*.3),85*(.65+p),115*(.65+p));}}
  if(kind==='spirit'&&light.complete&&light.naturalWidth){ctx.globalAlpha=.12*fade;ctx.drawImage(light,w*.45-90,h*.65-90,180,180);}
  ctx.globalAlpha=1;lastTime=time;frame=requestAnimationFrame(draw);
 }
 function portal(){if(reduced()||document.hidden)return;document.querySelector('.rk-rift-arrival')?.remove();const d=document.createElement('div');d.className='rk-rift-arrival';d.setAttribute('aria-hidden','true');d.innerHTML='<i></i><i></i>';document.body.appendChild(d);clearTimeout(portalTimer);portalTimer=setTimeout(()=>d.remove(),650);}
 const priorResolve=resolve;resolve=function(u,mk,tgt,mult){const result=priorResolve(u,mk,tgt,mult);if(result?.kind==='dmg'&&result.dmg>0&&!REGULAR.has(mk)&&!/arrowrain/i.test(mk)){const move=MOVES[mk];ability(fxType(move));}return result;};
 const priorPortal=openPortal;openPortal=function(){priorPortal();if(document.getElementById('portalOv')){clear();portal();}};
 const priorGo=go;go=function(v){const old=view;priorGo(v);if(old!==view){clear();const main=document.getElementById('main');main.scrollTop=0;window.scrollTo(0,0);main.classList.remove('rk-enter');void main.offsetWidth;main.classList.add('rk-enter');}sync();};
 const priorRender=render;render=function(){priorRender();sync();};
 const priorBattle=renderBattle;renderBattle=function(){priorBattle();sync();};
 const priorSettings=saveSettings;saveSettings=function(){priorSettings();clear();sync();};
 const priorHub=hubItems;hubItems=function(){const items=priorHub();if(!S?.tut)items.push(['atmosphere','⌁','Atmosphere','']);return items;};
 const priorRender2=render;render=function(){priorRender2();if(view==='atmosphere')document.getElementById('main').innerHTML=`<section class="activity-book"><span class="eyebrow">FEEL THE WORLD</span><h1>Air, ash & little wonders.</h1><p>Weather reacts to resolved magic. These controls change the presentation; damage and battle rules stay the same.</p><div class="atmosphere-options"><button class="btn" data-atmos="enabled" aria-pressed="${SET.mapWeather!==false}">Weather ${SET.mapWeather===false?'off':'on'}</button><button class="btn" data-atmos="lens" aria-pressed="${SET.weatherLens!==false}">Screen droplets & scorch ${SET.weatherLens===false?'off':'on'}</button><button class="btn" data-atmos="motion" aria-pressed="${reduced()}">Motion: ${SET.motion==='full'?'full':SET.motion==='reduced'?'reduced':'follow device'}</button></div><h2>Try a look</h2><p>Visit your location with a ten-second atmosphere preview.</p><div class="atmosphere-options">${[['storm','Rain'],['fire','Embers'],['ice','Frost'],['spirit','Spirit light']].map(([id,n])=>`<button class="btn" data-weather-preview="${id}">${n}</button>`).join('')}<button class="btn" data-atmos="clear">Clear the air</button></div><p class="local-note">Rain-006 particle limits and CC0 smoke/light textures adapted for this browser. No rapid lightning flashes. Reduced motion keeps a quiet, static tint.</p></section>`;};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-atmos],[data-weather-preview]');if(!b)return;
  if(b.dataset.weatherPreview){SET.mapWeather=true;saveSettings();go('hunt');ability(b.dataset.weatherPreview);return;}
  switch(b.dataset.atmos){case'enabled':SET.mapWeather=SET.mapWeather===false;break;case'lens':SET.weatherLens=SET.weatherLens===false;break;case'motion':SET.motion=SET.motion==='auto'?'full':SET.motion==='full'?'reduced':'auto';break;case'clear':clear();go('hunt');return;}saveSettings();render();
 });
 // Observe modal and scene lifetimes; polling snapshots never reset an in-flight cue.
 const observer=new MutationObserver(()=>{if(document.querySelector('.overlay,.ask,.sheet')||scope!==phase()||(scene&&!scene.isConnected))sync();});observer.observe(document.body,{childList:true,subtree:true});
 addEventListener('offline',()=>{offline=true;clear();clearTimeout(portalTimer);document.querySelector('.rk-rift-arrival')?.remove();});addEventListener('online',()=>{offline=false;sync();});
 addEventListener('visibilitychange',()=>{clear();sync();});addEventListener('pagehide',()=>{document.body.classList.add('rk-page-hidden');clear();clearTimeout(portalTimer);document.querySelector('.rk-rift-arrival')?.remove();});addEventListener('pageshow',sync);media.addEventListener('change',()=>{clear();sync();});
 return {sync,clear,ability,portal,get kind(){return effect?.kind||null;}};
})();
render();
