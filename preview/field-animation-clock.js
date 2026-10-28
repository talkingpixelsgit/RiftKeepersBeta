/* Presentation clock only. Contact is gated by the combat resolver. */
(function(root){
 function frameAt(times,elapsed,contact,confirmedAt){
  const cap=confirmedAt==null?Math.max(0,contact-1):times.length-1;
  let frame=confirmedAt==null?0:contact,time=Math.max(0,elapsed-(confirmedAt??0));
  while(frame<cap&&time>=times[frame]){time-=times[frame];frame++;}
  return frame;
 }
 function duration(times,contact){return times.slice(contact).reduce((a,b)=>a+b,0);}
 const api={frameAt,duration};
 if(typeof module!=='undefined')module.exports=api;else root.RKFieldClock=api;
})(typeof window==='undefined'?globalThis:window);
