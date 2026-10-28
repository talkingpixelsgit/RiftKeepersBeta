'use strict';
// Deliberately narrow alphabet prevents invisible characters and look-alike scripts.
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const key=value=>String(value).normalize('NFKC').toLowerCase().replace(/[013457@$!]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i'}[c])).replace(/[^a-z0-9]/g,'');
const reserved=/^(unknown|admin|administrator|moderator|mod|gamemaster|gm|operator|owner|creator|staff|support|system|official|developer|dev|talkingpixels|riftkeepers)\d*$/;
const abuse=/(fuck|shit|bitch|cunt|nigg|fagg|motherf|asshole|dickhead|cockhead|whore|slut|heilhitler|hitler|nazi)/;
function validateName(value,{owner=false,account=false}={}){
 if(typeof value!=='string')fail(400,'Choose a Keeper name.');
 const name=value.trim().normalize('NFKC');
 if(!(account?/^[A-Za-z0-9_.-]{3,32}$/:/^[A-Za-z][A-Za-z0-9 _'-]{2,17}$/).test(name))fail(400,account?'Account names need 3–32 letters, numbers, dots, underscores or hyphens.':'Keeper names need 3–18 letters, numbers, spaces, apostrophes, hyphens or underscores, starting with a letter.');
 const k=key(name);
 if(abuse.test(k))fail(400,'Please choose a different name; profanity and hateful names are not allowed.');
 if((reserved.test(k)||reserved.test(key(name.replace(/\d+$/,''))))&&!(owner&&k==='unknown'))fail(400,'That name is reserved. Please choose another.');
 return name;
}
module.exports={key,validateName};
