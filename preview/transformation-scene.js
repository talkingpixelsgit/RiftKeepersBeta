/* Temporary transformation scene: existing artwork, cosmetic only, no state awards. */
'use strict';
window.RKTransformationScene=(()=>{
 let node=null,timer=0,previous=null;const seen=new Set();
 const reduced=()=>SET.motion==='reduced'||SET.motion!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 function clear(restore=false){clearTimeout(timer);timer=0;node?.remove();node=null;if(restore){if(previous?.isConnected&&!previous.disabled)previous.focus({preventScroll:true});else if(typeof focusFirst==='function')focusFirst();}previous=null;}
 function play({from,to,name,key}={}){
  if(key&&seen.has(key))return false;
  if(key){seen.add(key);if(seen.size>100)seen.delete(seen.values().next().value);}
  if(document.hidden||!SPECIES[from]||!SPECIES[to]||document.querySelector('.ask,.sheet,.overlay,.timing'))return false;
  clear();previous=document.activeElement;node=document.createElement('div');node.id='rk-transform-scene';node.className='overlay rk-transform-scene'+(reduced()?' reduced':'');node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-labelledby','rk-transform-title');
  node.innerHTML=`<section class="rk-transform-panel"><p class="comp-kicker">A SOUL ANSWERS THE RIFT</p><h2 id="rk-transform-title">${esc(name||SPECIES[to].n)}</h2><div class="rk-transform-stage" aria-hidden="true"><div class="rk-transform-before">${portrait(from)}</div><div class="rk-transform-after">${portrait(to)}</div><i class="rk-transform-pulse"></i></div><p class="rk-transform-caption">A familiar soul. A different light.</p><button class="btn" data-cancel>Continue · A / Cross / B / Circle</button><small>Temporary scene · existing artwork</small></section>`;
  document.body.appendChild(node);node.querySelector('button').onclick=()=>clear(true);node.querySelector('button').focus({preventScroll:true});timer=setTimeout(()=>clear(true),reduced()?1600:2600);return true;
 }
 document.addEventListener('keydown',e=>{if(!node)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();clear(true);}else if(e.key==='Tab'){e.preventDefault();node.querySelector('button').focus();}},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});addEventListener('pagehide',()=>clear());addEventListener('offline',()=>clear());
 new MutationObserver(()=>{if(node&&document.querySelector('.ask,.sheet,.timing,.overlay:not(#rk-transform-scene)'))clear();}).observe(document.body,{childList:true,subtree:true});
 const oldGo=go;go=function(...args){clear();return oldGo(...args)};
 return {play,clear,get active(){return !!node;}};
})();
