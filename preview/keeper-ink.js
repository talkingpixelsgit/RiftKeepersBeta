/* Shared cloth palette for SVG idle sheets and canvas weapon frames. Art only. */
(function(root){
 'use strict';
 const blue=['#01030a','#030611','#0b0d26','#231943','#35306b','#214b9a','#277ec3','#44b5d7','#81e6ed','#dcfffa'];
 const otherLevels=[10,10,18,48,110,179,214,231,255,255];
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 function palette(tint){
  if(!/^#[0-9a-f]{6}$/i.test(tint||''))tint='#418dc9';
  if(tint.toLowerCase()==='#418dc9')return blue.map(rgb);
  const c=rgb(tint),peak=Math.max(...c,32),brightness=Math.min(1.15,Math.max(.3,peak/201));
  // Retain chosen cloak hues; only the ink-blue swatch uses the banner ramp.
  return otherLevels.map((level,i)=>c.map(v=>Math.min(255,Math.round(level*brightness*((i<3?.12:.08)+(i<3?.88:.92)*v/peak)))));
 }
 const luminance=(r,g,b)=>.2126*r+.7152*g+.0722*b;
 const band=value=>Math.min(9,Math.max(0,Math.floor(value/255*2*10)));
 function svg(tint){
  const p=palette(tint);
  return '<feGaussianBlur stdDeviation="2.2"/>'+ // Quiet fine cloth grain before banding.
   '<feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/>'+
   '<feComponentTransfer><feFuncR type="linear" slope="2"/><feFuncG type="linear" slope="2"/><feFuncB type="linear" slope="2"/></feComponentTransfer>'+
   '<feComponentTransfer result="ink-cloth">'+['R','G','B'].map((channel,j)=>'<feFunc'+channel+' type="discrete" tableValues="'+p.map(c=>(c[j]/255).toFixed(6)).join(' ')+'"/>').join('')+'</feComponentTransfer>'+rim(tint);
 }
 function rim(tint){
  if(String(tint).toLowerCase()!=='#418dc9')return '';
  // A narrow interior rim follows authored silhouettes in every frame. The
  // caller's cloth mask keeps it off the face, eyes, hands and equipment.
  return '<feMorphology in="SourceAlpha" operator="erode" radius="1.8" result="inset"/>'+
   '<feComposite in="SourceAlpha" in2="inset" operator="out" result="rim"/>'+
   '<feFlood flood-color="#419de8" flood-opacity=".7"/><feComposite in2="rim" operator="in"/>'+
   '<feMerge><feMergeNode in="ink-cloth"/><feMergeNode/></feMerge>';
 }
 const api={palette,luminance,band,svg};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.RKKeeperInk=api;
})(typeof window==='object'?window:this);
