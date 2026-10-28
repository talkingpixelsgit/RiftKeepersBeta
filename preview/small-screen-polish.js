'use strict';
window.RKSmallScreen=(()=>{
 const previousFit=fitMapView;
 fitMapView=function(){
  const svg=document.querySelector('.wmap');if(!svg)return;
  const points=Object.entries(MAPN).filter(([id])=>layerOf(id)===curLayer()&&mapAreaVisible(id)).map(([,p])=>p);
  const r=svg.getBoundingClientRect();if(!points.length||r.width<20||r.height<20){previousFit();return;}
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2+12;
  const ratio=r.width/r.height;let w=Math.max(500,Math.max(...xs)-Math.min(...xs)+290),h=Math.max(290,Math.max(...ys)-Math.min(...ys)+175);
  w=Math.max(w,h*ratio);h=w/ratio;svg.setAttribute('viewBox',`${cx-w/2} ${cy-h/2} ${w} ${h}`);
  // Minimum fourteen rendered pixels even after the discovered map grows wider.
  for(const n of svg.querySelectorAll('.nlbl'))n.style.setProperty('font-size',Math.max(20,14*w/r.width)+'px','important');
 };
 const originalArt=artImg;artImg=function(sp,filter){return sp==='thornhog'?`<img class="sprite" src="preview/assets/early-enemies/thornhog.png" alt="" draggable="false" style="filter:${filter||'none'}">`:originalArt(sp,filter);};
 function center(scroll){const svg=scroll.querySelector('svg'),node=svg?.querySelector('.mnode.here,.inode.here');if(!node)return;const r=node.getBoundingClientRect(),s=scroll.getBoundingClientRect();scroll.scrollLeft+=r.left+r.width/2-s.left-s.width/2;}
 function sync(){
  for(const svg of document.querySelectorAll('.wmap,.islemap svg')){
   if(svg.closest('.rk-map-scroll'))continue;
   const scroll=document.createElement('div');scroll.className='rk-map-scroll';scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Map. Swipe to pan; focus a location to bring it into view.');
   svg.before(scroll);scroll.append(svg);
   const note=document.createElement('p');note.className='rk-map-pan-note';note.textContent='Swipe to pan · controller directions select locations';scroll.after(note);
   // Scroll only this viewport, not the page or sticky combat controls.
   svg.addEventListener('focusin',e=>{const n=e.target.closest('[data-node],[data-inode]');if(!n)return;const r=n.getBoundingClientRect(),s=scroll.getBoundingClientRect();if(r.left<s.left+16||r.right>s.right-16)scroll.scrollLeft+=r.left+r.width/2-s.left-s.width/2;});
   requestAnimationFrame(()=>{fitMapView();center(scroll);});
  }
 }
 const original=render;render=function(...args){const r=original(...args);sync();return r;};
 addEventListener('resize',()=>requestAnimationFrame(()=>{for(const s of document.querySelectorAll('.rk-map-scroll'))center(s);}));
 sync();return {sync};
})();
