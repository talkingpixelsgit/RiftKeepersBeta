'use strict';
/* Controller drafts stay local until Apply. Sending chat or saving a guild is a separate action. */
window.RKControllerText=(()=>{
 const characters="abcdefghijklmnopqrstuvwxyz0123456789'-.,!?".split('');
 const ids=new Set(['hIn','party-code','world-message']);
 let entry=null;
 const oldPress=padPress,oldDir=padDir,oldBack=padBack,oldFirst=focusFirst,oldGo=go;
 function eligible(el){return !!el&&el.tagName==='INPUT'&&(['text','search'].includes(el.type||'text')||el.type==='password'&&el.hasAttribute?.('data-rk-account'))&&!el.disabled&&!el.readOnly&&(el.hasAttribute?.('data-rk-account')||ids.has(el.id)||!!el.dataset.guildKey||(['bag','armoury'].includes(view)&&['search','rename'].includes(el.dataset.invKey)));}
 function context(el){const kind=el.dataset.guildKey?'guild':el.dataset.invKey||el.id;const state=window.RKParty?.state;
  return JSON.stringify([view,kind,kind==='guild'?[state?.you?.id,state?.guild?.mine]:kind==='party-code'?[state?.you?.id,state?.party?.id]:kind==='world-message'?[state?.you?.id,S?.loc]:kind==='rename'?document.querySelector('.equipment-compare [data-inv-key^="equip:"]')?.dataset.invKey:null]);}
 function source(info=entry){if(!info)return null;const el=info.guildKey?[...document.querySelectorAll('input[data-guild-key]')].find(e=>e.dataset.guildKey===info.guildKey):info.invKey?[...document.querySelectorAll('input[data-inv-key]')].find(e=>e.dataset.invKey===info.invKey):document.getElementById(info.id);
  return eligible(el)&&context(el)===info.context&&S===info.save?el:null;}
 function clipped(value,max){let out='';for(const c of value){if(out.length+c.length>max)break;out+=c;}return out;}
 function keys(){return entry?[...entry.panel.querySelectorAll('[data-text-key]')]:[];}
 function focusKey(index){const list=keys();if(!list.length)return;entry.index=Math.max(0,Math.min(list.length-1,index));list[entry.index].focus({preventScroll:true});list[entry.index].scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}
 function update(){if(!entry)return;const input=entry.input;input.value=clipped(input.value,entry.max);entry.count.textContent=`${input.value.length} / ${entry.max}`;}
 function write(action){if(!entry)return;const input=entry.input;
  if(action==='delete')input.value=Array.from(input.value).slice(0,-1).join('');
  else if(action==='clear')input.value='';
  else if(action==='case'){entry.upper=!entry.upper;keys().slice(0,characters.length).forEach((b,i)=>b.textContent=entry.upper?characters[i].toUpperCase():characters[i]);entry.panel.querySelector('[data-text-action="case"]').setAttribute('aria-pressed',String(entry.upper));}
  else input.value=clipped(input.value+(action==='space'?' ':entry.upper?action.toUpperCase():action),entry.max);
  update();
 }
 function close(apply=false,restore=true){if(!entry)return false;const el=source();
  if(apply&&(!el||el.value!==entry.original)){entry.message.textContent='This field changed while you were editing. Cancel and reopen it to use the latest version.';return false;}
  const info=entry,value=entry.input.value,panel=entry.panel;entry=null;panel.remove();
  if(apply){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  if(restore){const next=source(info);if(next?.isConnected)next.focus({preventScroll:true});else focusFirst();}return true;
 }
 function valid(){if(!entry)return false;if(view!==entry.view||B||timingActive||guardActive||MG_ON||padScope()!==entry.panel){close(false,false);return false;}return true;}
 function open(el){if(entry||!eligible(el)||B||timingActive||guardActive||MG_ON||padScope())return false;
  const max=el.maxLength>0?Math.min(el.maxLength,200):200;
  const label=el.getAttribute('aria-label')||el.labels?.[0]?.textContent||(el.id==='hIn'?'Keeper name':el.id==='party-code'?'Invitation code':'Area message');
  const panel=document.createElement('div');panel.className='overlay rk-text-entry';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','rk-text-title');
  const actions=[['space','Space'],['case','Case'],['delete','Delete last'],['clear','Clear'],['apply','Apply'],['cancel','Cancel']];
  panel.innerHTML=`<section class="rk-text-card"><header><span class="eyebrow">KEEPER'S SCRIPT</span><h2 id="rk-text-title">${esc(label)}</h2></header><label for="rk-text-draft">Your draft</label><input id="rk-text-draft" type="text" maxlength="${max}" autocomplete="off" spellcheck="false" aria-describedby="rk-text-help"><p class="rk-text-info"><span data-text-count></span><span data-text-message role="status">Apply fills the field. Use its Send or Save button afterward.</span></p><div class="rk-text-keys">${characters.map((c,i)=>`<button type="button" class="btn" data-text-key="${i}" data-text-letter="${i}">${esc(c)}</button>`).join('')}${actions.map(([a,l],i)=>`<button type="button" class="btn" data-text-key="${characters.length+i}" data-text-action="${a}" ${a==='case'?'aria-pressed="false"':''}>${l}</button>`).join('')}</div><p id="rk-text-help">D-pad / stick: keys · A / Cross: choose · B / Circle: cancel<br>X / Square: delete last · Y / Triangle: space. Left and right wrap.</p></section>`;
  document.body.appendChild(panel);
  entry={panel,input:panel.querySelector('#rk-text-draft'),count:panel.querySelector('[data-text-count]'),message:panel.querySelector('[data-text-message]'),max,original:el.value,save:S,view,context:context(el),id:el.id,guildKey:el.dataset.guildKey,invKey:el.dataset.invKey,index:0,upper:el.id==='party-code'};
  if(el.type==='password')entry.input.type='password';entry.input.value=clipped(el.value,max);if(entry.upper){entry.upper=false;write('case');}update();
  panel.addEventListener('click',e=>{const key=e.target.closest('[data-text-key]');if(!key||!valid())return;entry.index=Number(key.dataset.textKey);const action=key.dataset.textAction;if(action==='apply'||action==='cancel')close(action==='apply');else write(action||characters[Number(key.dataset.textLetter)]);});
  entry.input.addEventListener('input',update);focusKey(0);return true;
 }
 function direction(dx,dy){if(!entry)return;const list=keys(),i=list.indexOf(document.activeElement),n=i<0?entry.index:i;
  // Six columns at every width: horizontal travel wraps within the same row.
  const row=Math.floor(n/6),col=n%6;focusKey(Math.max(0,Math.min(7,row+Math.sign(dy)))*6+(col+Math.sign(dx)+6)%6);
 }
 padPress=function(i){if(entry){if(!valid())return;setPad(true);awayActive();if(i===0){const active=document.activeElement;if(keys().includes(active))active.click();else focusKey(entry.index);}else if(i===1)close();else if(i===2)write('delete');else if(i===3)write('space');return;}
  if(i===0&&eligible(document.activeElement)&&!B&&!padScope()){setPad(true);awayActive();if(open(document.activeElement))return;}return oldPress(i);};
 padDir=function(dx,dy){if(entry){if(valid()){if(dx||dy)awayActive();setPad(true);direction(dx,dy);}return;}return oldDir(dx,dy);};
 padBack=function(){if(entry){close();return;}return oldBack();};
 focusFirst=function(){if(entry&&padScope()===entry.panel){focusKey(entry.index);return;}return oldFirst();};
 go=function(...args){if(entry)close(false,false);return oldGo(...args);};
 // Contain keyboard navigation too; Enter in the draft never sends a message.
 document.addEventListener('keydown',e=>{if(!entry||!valid())return;e.stopImmediatePropagation();
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key==='Tab'){e.preventDefault();const list=[entry.input,...keys()],i=list.indexOf(document.activeElement);list[(i+(e.shiftKey?-1:1)+list.length)%list.length].focus();return;}
  if(e.target===entry.input){if(e.key==='Enter'){e.preventDefault();focusKey(characters.length+4);}return;}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();direction(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0);}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(keys().includes(document.activeElement))document.activeElement.click();}
 },true);
 addEventListener('pagehide',()=>close(false,false));
 new MutationObserver(()=>{if(entry)valid();}).observe(document.body,{childList:true,subtree:true});
 return {open,close,get active(){return !!entry;}};
})();
