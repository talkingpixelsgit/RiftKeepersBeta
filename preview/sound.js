/* Auditable cue palette, shuffle bags and bounded decoded voices. Music stays independent. */
'use strict';
window.RKSound=(()=>{
 const files=(...names)=>names.map(n=>'art/sfx/'+n+'.ogg');
 const banks={
  tick:['preview/assets/ui-focus-01.wav','preview/assets/ui-focus-02.wav'],
  hit:files('sword_impact_hit_1','sword_impact_hit_2','sword_impact_hit_3'),
  whoosh:files('sword_attack_1','sword_attack_2','sword_attack_3'),
  guard:files('sword_blocked_1','sword_blocked_2','sword_parry_1'),
  spirit:files('spell_impact_1','spell_impact_2','spell_impact_3'),
  charge:files('firebuff_1','firebuff_2'),
  heavy:files('rock_meteor_throw_1','rock_meteor_throw_2'),
  beast:files('big_distant_thump_1','big_distant_thump_2'),
  chest:files('big_distant_thump_1','big_distant_thump_2'),
  fire:files('fireball_1','fireball_2','fireball_3'),
  wildfire:files('firespray_1','torch_impact_1'),
  ward:files('rock_wall_1','sword_blocked_2'),
  restore:['preview/assets/ui-reveal.wav'],
  loot:files('chest_open_1','chest_open_2'),
  click:['preview/assets/ui-confirm.wav'],back:['preview/assets/ui-back.wav'],equip:['preview/assets/ui-equip.wav'],open:['preview/assets/ui-open.wav'],discovery:['preview/assets/ui-reveal.wav']
 };
 const bags=new Map(),last=new Map(),cache=new Map(),voices=new Set(),cooldown=new Map();let epoch=0,serial=0,queue=Promise.resolve(),bus=null;
 function pick(name,rng=Math.random){const source=banks[name];if(!source)return null;let bag=bags.get(name);if(!bag?.length){bag=source.slice();for(let i=bag.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.length>1&&bag[bag.length-1]===last.get(name))[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];bags.set(name,bag);}const f=bag.pop();last.set(name,f);return f;}
 const allowed=()=>!muted&&SET.sfxOn!==false&&!document.hidden;
 function clear(){epoch++;voices.forEach(v=>{try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();});voices.clear();}
 async function play(name,power=.5){if(!allowed())return;const now=Date.now();if(now-(cooldown.get(name)||0)<(name==='tick'?65:90))return;cooldown.set(name,now);
  const path=pick(name);if(!path)return;const a=ac();if(!a)return;const token=epoch,started=now;
  try{if(!cache.has(path))cache.set(path,fetch(path).then(r=>{if(!r.ok)throw Error(path);return r.arrayBuffer();}).then(b=>a.decodeAudioData(b)).catch(e=>{cache.delete(path);throw e;}));const buffer=await cache.get(path);if(token!==epoch||!allowed()||Date.now()-started>1200)return;
   while(voices.size>=5){const v=voices.values().next().value;v.source.stop();v.source.disconnect();v.gain.disconnect();voices.delete(v);}
   const source=a.createBufferSource(),gain=a.createGain();source.buffer=buffer;source.playbackRate.value=1+(Math.random()-.5)*(name==='tick'?.025:.08);gain.gain.value=Math.max(0,Math.min(.7,SET.vol*(name==='tick'?.22:name==='chest'?.12:.5+Math.max(0,Math.min(1,power))*.2)));
   if(!bus){bus=a.createDynamicsCompressor();bus.threshold.value=-12;bus.knee.value=12;bus.ratio.value=12;bus.attack.value=.003;bus.release.value=.12;bus.connect(a.destination);}source.connect(gain).connect(bus);const v={source,gain,level:SET.vol?gain.gain.value/SET.vol:0};voices.add(v);source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();};source.start();return true;
  }catch{return false; /* Unsupported audio never blocks combat or moves focus. */}
 }
 const old=sfx;sfx=function(name,power=.5){if(banks[name]){rumble(name);void play(name,power);}else if(!document.hidden)old(name,power);};
 function cue(e,match){const u=match.units.find(x=>x.id===e.unit);if(e.type==='stagger')return 'guard';if(e.type==='evolve')return 'discovery';if(e.type==='restore')return 'restore';if(e.type==='enemy')return e.label==='Fracture Falters'?'guard':u?.sp==='warden'?'spirit':'beast';if(e.type!=='action')return null;if(e.move==='guard')return 'guard';if(e.move==='tonic'||e.move==='ether')return 'restore';if(e.move==='attack')return u?.sp==='beast'?'beast':u?.sp==='tibrs'?'fire':u?.sp==='voth'?'spirit':'whoosh';if(['tumbleknot','sootling','ticktail','pipwisp','hushmoth','hollowknave','shardheart','boltwarden'].includes(u?.sp))return u.sp==='pipwisp'?'restore':e.move==='technique'?'ward':u.sp==='sootling'?'fire':u.sp==='hollowknave'?'heavy':'spirit';if(u?.sp==='voth')return e.move==='technique'?'charge':'spirit';if(u?.sp==='beast')return e.move==='technique'?'ward':'heavy';if(u?.sp==='tibrs')return e.move==='technique'?'wildfire':'fire';return e.move==='technique'?'ward':'spirit';}
 function events(list,match){const cues=list.map(e=>cue(e,match)).filter(Boolean);const unique=[...new Set(cues)].slice(0,3),token=epoch,id=++serial;queue=Promise.resolve();unique.forEach((name,i)=>{queue=queue.then(()=>new Promise(resolve=>setTimeout(resolve,i?160:0))).then(()=>{if(epoch===token&&serial===id)void play(name,.5);});});}
 const mute=toggleMute;toggleMute=function(){mute();if(muted)clear();};
 addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 document.addEventListener('change',()=>{if(!allowed())clear();});document.addEventListener('input',()=>{for(const v of voices)v.gain.gain.value=Math.min(.7,SET.vol*v.level);});
 const settings=settingsHTML;settingsHTML=function(){return settings()+`<section class="inventory-screen sound-audition"><h3>Sound palette</h3><p>Preview the combat cues at your current effects volume. Music and mute settings still apply.</p><div class="inventory-actions">${[['spirit','Voth · spirit'],['charge','Voth · charge'],['beast','Beast · impact'],['heavy','Beast · shatter'],['fire','Tibrs · fire'],['wildfire','Tibrs · wildfire'],['guard','Block / interrupt'],['loot','Cache opening']].map(([id,n])=>`<button class="btn" data-sound-cue="${id}">${n}</button>`).join('')}<button class="btn" data-sound-cue="stop">Stop preview</button></div><p class="sound-preview-status" role="status">Choose a cue to listen.</p><p class="meta">The current palette reuses bundled effects and Talking Pixels UI audio. Final listening balance remains a playtest decision.</p><p class="meta">Icon credits: Eldrion Team · Cursed Status Effects; your 1200 Icons RPG and Shikashi libraries. Additional weapon silhouettes: Lorc and Delapouite via <a href="https://game-icons.net" target="_blank" rel="noopener">Game-icons.net</a>, <a href="preview/assets/icons/LICENSE.txt" target="_blank" rel="noopener">CC BY 3.0</a>. Original files retained unchanged.</p></section>`;};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-sound-cue]');if(b){clear();const label=b.textContent;if(b.dataset.soundCue==='stop'){const el=document.querySelector('.sound-preview-status');if(el)el.textContent='Preview stopped.';}else void play(b.dataset.soundCue,.5).then(ok=>{const el=document.querySelector('.sound-preview-status');if(el)el.textContent=ok?'Playing '+label:!allowed()?'Sound effects are muted. Enable them above to listen.':'This cue could not play. Try again.';});}});
 return {pick,play,events,clear,cue,banks};
})();
