/* Gemwild's flipbook flame treatment, adapted to Rift Keepers' live control bounds.
   Presentation only: no gameplay randomness, input handlers, saves or scoring. */
'use strict';
window.RKScreenMagic=(()=>{
 const canvas=document.createElement('canvas');canvas.id='rk-screen-magic';canvas.inert=true;canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 const ctx=canvas.getContext('2d'),flame=new Image(),mist=new Image();
 flame.src='preview/assets/arcane/flame.png';mist.src='preview/assets/weather/smoke.png';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const protectedSelector='button,a,input,select,textarea,summary,[role="button"],.tbox,#gwin,.mgbox,.rk-command-panel,.fighter-readout,.combat-status,.rk-cinema-copy,.unit .stats,.hp,.hpnum,.battle-log,.overlay .rbox,.sheet,.ask';
 let frame=0,last=0,dead=false,offline=false,draws=0,weatherKind=null,protectedBoxes=[];
 const enabled=()=>!!ctx&&!!S?.arch&&!S.tut&&!document.querySelector('.first-light-art')&&!document.hidden&&!dead&&!offline&&SET.motion!=='reduced'&&!motion.matches&&(SET.arcaneMode||'full')==='full';
 function clear(){cancelAnimationFrame(frame);frame=0;ctx?.clearRect(0,0,canvas.width,canvas.height);canvas.hidden=true;}
 function geometry(){
  const v=visualViewport,w=v?.width||innerWidth,h=v?.height||innerHeight,x=v?.offsetLeft||0,y=v?.offsetTop||0,dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.style.left=x+'px';canvas.style.top=y+'px';canvas.style.width=w+'px';canvas.style.height=h+'px';
  if(canvas.width!==Math.round(w*dpr))canvas.width=Math.round(w*dpr);if(canvas.height!==Math.round(h*dpr))canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);return {w,h,x,y};
 }
 function protect(v){
  protectedBoxes=[];
  // Clear each region separately: overlapping controls must never cancel their protection.
  for(const el of document.querySelectorAll(protectedSelector)){
   if(!el.getClientRects().length)continue;const r=el.getBoundingClientRect();
   if(r.bottom< v.y||r.top>v.y+v.h||r.right<v.x||r.left>v.x+v.w)continue;
   const box={x:r.left-v.x-12,y:r.top-v.y-12,w:r.width+24,h:r.height+24};protectedBoxes.push(box);ctx.clearRect(box.x,box.y,box.w,box.h);
  }
 }
 function magic(w,h,t){
  // Separate slow fog, flowing edge ribbons and faster motes establish depth.
  if(mist.complete&&mist.naturalWidth){ctx.globalAlpha=.13;for(let i=0;i<3;i++){const s=w<600?230:400;ctx.drawImage(mist,i%2?w-s*.55:-s*.4,h*(.18+i*.28)+Math.sin(t*.23+i)*24,s,s*.7);}}
  ctx.globalAlpha=1;
  for(const side of [0,1]){const edge=side?w:0;
   for(let band=0;band<2;band++){
    ctx.beginPath();for(let y=0;y<=h+12;y+=12){const inset=12+band*16+Math.sin(y/95-t*(.8+band*.3)+band)*10;const x=edge+(side?-inset:inset);y?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.strokeStyle=band?'#bb79ec60':'#70f3ed70';ctx.lineWidth=band?2:3;ctx.stroke();
   }
  }
  for(let i=0;i<(w<600?12:22);i++){const side=i%2,x=side?w-8-(i*13%42):8+i*13%42,y=(h+i*83-t*(12+i%4*8))%h;ctx.fillStyle=i%3?'#a1f4efaa':'#ffd18baa';ctx.beginPath();ctx.arc(x,y,1.5+i%2,0,Math.PI*2);ctx.fill();}
 }
 function fire(w,h,t){
  if(!flame.complete||!flame.naturalWidth)return;
  const fw=flame.naturalWidth/16,fh=flame.naturalHeight/4,dh=w<600?105:155;
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=.85;
  for(let i=0;i<Math.ceil(w/90)+1;i++){const f=(Math.floor(t*24)+i*7)%64;ctx.drawImage(flame,f%16*fw,Math.floor(f/16)*fh,fw,fh,i*90-30,h-dh,140,dh+12);}
  for(let i=0;i<4;i++){const f=(Math.floor(t*24)+i*11)%64;ctx.save();ctx.translate(i%2?w:0,h*(.2+i*.18));ctx.rotate(i%2?-Math.PI/2:Math.PI/2);ctx.drawImage(flame,f%16*fw,Math.floor(f/16)*fh,fw,fh,-45,-dh*.72,90,dh);ctx.restore();}
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 }
 function weather(kind,w,h,t){
  if(kind==='fire'){fire(w,h,t);return;}
  if(kind==='rain'){
   for(let i=0;i<(w<600?24:38);i++){const edge=i%2?w:0,inset=5+i*17%Math.min(105,w*.2),x=edge+(i%2?-inset:inset),y=(i*89+t*(180+i%5*65))%(h+45)-45;
    ctx.strokeStyle=i%3?'#a8dff790':'#dcfaffbb';ctx.lineWidth=i%3?1.5:2.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5,y+24+i%3*10);ctx.stroke();}
   // Large close droplets read as rain on the glass rather than a flat tint.
   for(let i=0;i<6;i++){const x=i%2?w-12-i*7:12+i*7,y=(i*151+t*18)%(h+30)-15;ctx.strokeStyle='#d6faffaa';ctx.fillStyle='#9bd9ec22';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,4+i%3,8+i%3*2,-.2,0,Math.PI*2);ctx.fill();ctx.stroke();}
  }else if(kind==='frost'){
   for(let i=0;i<20;i++){const x=i%2?w-12-i*3:12+i*3,y=(i*67+t*24)%(h+10);ctx.fillStyle='#e3f7ffb3';ctx.beginPath();ctx.arc(x,y,1.5+i%3,0,Math.PI*2);ctx.fill();}
  }
 }
 function draw(now){
  frame=0;if(!enabled()){clear();return;}frame=requestAnimationFrame(draw);if(now-last<33)return;last=now;
  canvas.hidden=false;const v=geometry();ctx.clearRect(0,0,v.w,v.h);magic(v.w,v.h,now/1000);
  weatherKind=SET.mapWeather!==false&&SET.weatherLens!==false?(window.RKAtmosphere?.kind||window.RKArcane?.event):null;
  weather(weatherKind,v.w,v.h,now/1000);
  protect(v);draws++;
 }
 function sync(){if(!enabled()){clear();return;}if(!frame){last=0;frame=requestAnimationFrame(draw);}}
 const timer=setInterval(sync,250);
 document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
 addEventListener('pagehide',()=>{dead=true;clear();});addEventListener('pageshow',()=>{dead=false;sync();});
 addEventListener('offline',()=>{offline=true;clear();});addEventListener('online',()=>{offline=false;sync();});
 addEventListener('resize',()=>{clear();sync();});visualViewport?.addEventListener('resize',()=>{clear();sync();});
 sync();return {sync,clear,get active(){return !!frame;},get draws(){return draws;},get weather(){return weatherKind;},get protectedBoxes(){return protectedBoxes.map(b=>({...b}));}};
})();
