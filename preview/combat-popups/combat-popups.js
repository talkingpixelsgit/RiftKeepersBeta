// Passive visual API. The caller owns all timing, outcomes and accessible game text.
export const actors={keeper:{name:'Keeper',cues:['capture-bind','capture-break']},voth:{name:'Voth',cues:['red-charge','spirit-release']},beast:{name:'Beast',cues:['iron-roar','guard-break']},ticktail:{name:'Ticktail',cues:['enemy-tell','counter-impact']}};
export const cues={
 'rift-cut':['Rift cut','#82e9fa','A sharp diagonal ink tear; show contact only after the game confirms the hit.'],
 'capture-bind':['Soul tether','#bca0ff','Violet threads converge around the Keeper; the seal closes on confirmed capture.'],
 'capture-break':['Tether broken','#a8b4d4','A broken seal and separated strands distinguish a failed capture without relying on colour.'],
 'red-charge':['Charge up','#ff5868','Persistent red rising strokes surround Voth for the full QTE; no flashing prompt.'],
 'spirit-release':['Energy Blast','#77edee','Voth extends both palms for the existing spiritbrand move. An aqua fan opens on confirmed release.'],
 'iron-roar':['Face Me!','#9baffe','Beast braces to protect the party. Source move: fusehide. Unarmed portrait preserves weapon handedness when mirrored.'],
 'guard-break':['Guard fracture','#b4a0ff','Split chevrons and a short impact cross mark a confirmed break.'],
 'enemy-tell':['Tackle','#cfb0ff','Ticktail coils for its existing Tackle move. Brackets remain until the caller ends the enemy tell.'],
 'counter-impact':['Counter','#7ff5db','An interrupted slash and aqua cross identify a confirmed counter.']
};
let manifest;const mounts=new WeakMap();
export async function ready(){return manifest ||= await fetch(new URL('manifest.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json();});}
export async function sprite(actor,facing='right',pose='default'){
 const m=await ready(),spec=m.actors[actor].variants?.[pose]?.[facing]||m.actors[actor].facings[facing],s=pose==='source'?{...m.actors[actor].source_reference,mirror:facing==='left'}:spec;
 if(!s)throw Error('No genuine '+facing+' artwork for '+actor);
 const wrap=document.createElement('div');wrap.className='cp-sprite';wrap.dataset.facing=facing;wrap.dataset.provenance=s.status;
 const canvas=document.createElement('canvas');canvas.width=600;canvas.height=340;wrap.append(canvas);
 const im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(Error('Missing art '+s.file));im.src=s.file.startsWith('/source/')?s.file:new URL(s.file,import.meta.url).href;});
 const ctx=canvas.getContext('2d'),r=s.crop||[0,0,im.width,im.height],scale=Math.min(570/r[2],324/r[3]),w=r[2]*scale,h=r[3]*scale;
 ctx.save();if(s.mirror){ctx.translate(600,0);ctx.scale(-1,1);}ctx.drawImage(im,...r,300-w/2,334-h,w,h);ctx.restore();return wrap;
}
export async function mount(host,{actor='keeper',facing='right',cue=actors[actor].cues[0],phase='anticipation',reduced=false}={}){
 if(!actors[actor]||!['left','right','front'].includes(facing)||!actors[actor].cues.includes(cue))throw Error('Unsupported popup selection');
 const token={};mounts.set(host,token);
 const n=document.createElement('div');n.className='cp-popup';n.setAttribute('aria-hidden','true');n.inert=true;n.dataset.actor=actor;n.dataset.cue=cue;n.dataset.phase=phase;n.dataset.reduced=String(reduced);n.style.setProperty('--accent',cues[cue][1]);
 const art=await sprite(actor,facing,cue);
 const ink=document.createElement('div');ink.className='cp-ink';
 const accent=document.createElement('img');accent.className='cp-accent';accent.alt='';accent.src=new URL('assets/'+cue+'.svg',import.meta.url).href;
 const lines=document.createElement('div');lines.className='cp-energy';for(let i=0;i<7;i++){let s=document.createElement('i');s.style.setProperty('--i',i);lines.append(s);}
 const words=document.createElement('div');words.className='cp-words';const label=document.createElement('small'),title=document.createElement('b'),state=document.createElement('span');label.textContent=actors[actor].name;title.textContent=cues[cue][0];words.append(label,title,state);
 n.append(ink,accent,lines,art,words);if(mounts.get(host)===token)host.replaceChildren(n);
 function setPhase(p){if(!['anticipation','result','settled'].includes(p))throw Error('Unsupported phase');n.dataset.phase=p;state.textContent=p==='anticipation'?(cue==='red-charge'?'GATHERING POWER':cue==='enemy-tell'?'WATCH THE TELL':'FOCUS'):p==='result'?(cue==='capture-break'?'BROKEN':cue==='capture-bind'?'BOUND':cue==='counter-impact'?'COUNTERED':'RELEASE'):' ';}
 setPhase(phase);return {node:n,setPhase,setReduced(value){n.dataset.reduced=String(value);},destroy(){n.remove();}};
}
export function clear(host){mounts.set(host,{});host.querySelectorAll('.cp-popup').forEach(n=>n.remove());}
