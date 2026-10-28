'use strict';
// Original playtest story, using three proposed gods from the owner's Hall lore draft.
// Their claims are testimony, not a universal explanation of the Hall or Drew.
const gods={
 tirren:{name:'Tirren',title:'The Crooked Coin',icon:'coin',arrival:'The traveler has mismatched boots and a coin that lands on its edge. He catches it before Drew sees. “A woman has been having the same unlucky night for twenty-eight years. I would like you to spoil somebody’s excellent odds.”',motive:'“I bent a crossing away from seven funerals. Orren found a way to keep it bent. People have called that road lucky ever since.” Tirren turns the chipped coin over. Neither face is smiling. “Yes. Some of that gratitude reached me. No. I did not ask where the rest of the bill was going.”',reply:'“I could say I never promised a fair world. That would be true, and an appalling answer.” He leaves the coin flat on the table. “Show me a better wager than one person losing forever.”',farewell:'Tirren tries to flick his coin and misses. For once, you think the mistake is genuine. “Keep this. If anyone tells you a god paid their debt in full, ask who wrote the receipt.”'},
 sereva:{name:'Sereva',title:'Keeper of Names',icon:'scroll',arrival:'You recognize the stranger’s face without remembering whose it is. Names move inside her sleeves. She covers one with her thumb. “There is a woman everyone calls brave. Nobody can tell me what she asked for. I need you to find the difference.”',motive:'“I kept Mara’s name from washing out of the world. I thought remembrance was enough.” A name unthreads itself from Sereva’s cuff. “A story can preserve a person and still imprison her. I accepted the beautiful version because it was easier to bear.”',reply:'“Then write that I was wrong. Write that I needed someone else to notice.” She meets your eyes. “Do not repair my part of the story by removing hers.”',farewell:'Sereva writes her own name on the edge of Drew’s receipt, then crosses out the title beneath it. “If this ever asks you to remember me, remember this conversation too. Especially the parts I would rather you forgot.”'},
 korrath:{name:'Korrath',title:'Witness of the Last Promise',icon:'shield',arrival:'A cracked bell hangs at the stranger’s hip. It makes no sound when he sits. “An oath has been kept for twenty-eight years,” he says. “Its witness has begun to suspect that it was never sworn. I am the witness.”',motive:'“Mara promised one last crossing. I heard the words. Orren submitted a longer promise under her name, and I accepted the seal instead of asking the woman.” Korrath grips the cracked bell. “I have spent twenty-eight years mistaking endurance for consent.”',reply:'“A promise made to save someone is not permission to own them. You need not forgive me to make use of that distinction.” The bell sounds once, very softly. “Nor does she.”',farewell:'Korrath sets the cracked bell on Drew’s table before he gives you the droplet. “This is a gift, not a contract. You owe me no prayer, service or silence. I would like that recorded.”'}
};
const choice=(id,label,next,extra={})=>({id,label,next,...extra});
const node=(chapter,loc,speaker,title,text,choices=[],extra={})=>({chapter,loc,speaker,title,text,choices,...extra});
const nodes={
 invitation:node(1,'town','Drew','A place already set',[
  'Drew sets down two clean glasses. One is in front of you. The other stands beside an untouched supper, though the chair is empty.',
  '“Someone asked for you,” he says. “Not by name. By the things you haven’t decided to become.”',
  'The chair scrapes across the floor. For an instant, the room is full of the smell of river mud. Every other guest continues eating. Drew watches you notice that, and says nothing.'
 ],[choice('sit','Sit opposite the stranger.','offer')]),
 offer:node(1,'town','{god}','The guest who never left',['{arrival}','The stranger places a brass room key between the glasses. A wet thread is tied through its bow. “Room Seven. A ferrier named Mara. Find her, learn what holds her here, and return with an answer you can defend.”'],[choice('terms','What exactly am I agreeing to?','terms'),choice('accept','I will hear her story. I promise nothing else.','drew')]),
 terms:node(1,'town','{god}','No hidden signature',[
  '“You are agreeing to investigate. Not to obey me, worship me, or surrender anything you carry. You may stop. You may come back and tell me I am the problem.”',
  'Drew slides the key nearer. “You heard that too,” he says. The stranger nods.',
  '“Finish this honestly and I will give you a droplet of my soul. What you do with the answer is your decision. What you eventually do with the droplet will be yours as well.”'
 ],[choice('accept','Then we understand each other.','drew')]),
 drew:node(1,'town','Drew','Twenty-eight years of supper',[
  'Drew opens the room ledger. Room Seven has been paid for every night for twenty-eight years. Each payment is one wet copper. Each supper comes back warm and untouched.',
  '“Mara brought seven people off the Fen ferry during the breach. They called her a hero. Her daughter called for her mother. Those are different requests.”',
  'You ask whether Mara is dead. “I have not said she is.” He closes the ledger. “Iona mends coats by the town gate. Ask about the person before you ask about the miracle.”'
 ],[choice('go','Find Iona at Hall’s Edge.','iona')]),
 iona:node(2,'town','Iona','The woman in the borrowed coat',[
  'Iona is turning a coat inside out. The shoulders have been let down twice. She has her mother’s age in the old stories, and none of her mother’s patience with them.',
  '“If this is another collection for the brave ferrier, give it to someone who can eat it.” She sees the room key. The needle stops halfway through the cloth.',
  '“I was six when she went out. Last night I found a note in this pocket telling me not to walk home alone. I sewed this pocket yesterday.”'
 ],[choice('memory','Tell me something about her that the songs leave out.','iona_memory'),choice('letter','What did the note say?','iona_letter')]),
 iona_memory:node(2,'town','Iona','A very ordinary mother',[
  '“She cheated at cards. Badly. She would cough, look at the ceiling, and move the same card every time. She hated pears. The ferry bell frightened her after dark, though she never let passengers see.”',
  'Iona pulls a little blue button from her sewing tin. “She sewed this inside my sleeve so I could find my own coat in a crowded room. Said a person should have one thing the world couldn’t mistake.”',
  'For the first time she looks directly at you. “If someone down there knows about the button, listen. Anyone can learn the song.”'
 ],[choice('keep','Remember the blue button.','iona_letter',{set:{button:true},clue:'Mara sewed a blue button inside Iona’s sleeve. A private memory, absent from the heroic songs.'})]),
 iona_letter:node(2,'town','Iona','The note that arrived too late',[
  'The writing is cramped, the paper dry. “Stay at Drew’s until I come back. There is enough for one room. Don’t let Orren talk you into helping. He still thinks sorry is a plan.”',
  'Iona folds the paper along creases it did not have when you arrived. “Orren keeps the old watch-post in the Meadow. He was the last one off her boat. He tells that part often.”',
  '“If she can come home, bring her. If she cannot…” She pulls the coat straight. “Don’t let anyone make me spend another year preparing a bed for a story.”'
 ],[choice('truth','I will bring you the truth, even if it hurts.','meadow',{set:{promise:'truth'}}),choice('home','I will try to bring her home.','meadow',{set:{promise:'home'}})]),
 meadow:node(2,'meadow','Orren','The man who kept the bell',[
  'The old watch-post leans toward the Fen. Inside, seven names are cut into a beam. Someone has polished six until the wood shines. The seventh is almost worn away.',
  'Orren opens the door with a knife in one hand and half a pear in the other. He sees the key and lays both down.',
  '“Every few years someone comes to release her. They like that word. They rarely ask what they are releasing her from—or what they are releasing into.”'
 ],[choice('listen','Tell me what happened at the crossing.','orrens_account'),choice('accuse','Why did Mara warn her daughter about you?','orrens_shame',{set:{approach:'accuse'}})]),
 orrens_account:node(2,'meadow','Orren','Seven people and a door',[
  '“The river opened into somewhere it had no business going. Water came up through the boat. Mara rowed while the rest of us prayed, shouted, made bargains. I was sixteen. I promised anything. I meant it.”',
  'He looks at the polished names. “She said: one last crossing. I will hold it until the last traveler is home. A god heard her. The water stopped rising.”',
  '“Six people reached this bank. I reached it last. The door stayed open. I thought if the promise ended, all the water would come through.”'
 ],[choice('record','Show me the written bargain.','record'),choice('why','What did you do?','orrens_shame')]),
 orrens_shame:node(2,'meadow','Orren','An apology is not a plan',[
  '“I wrote down what I thought she meant. Until the last traveler is home. There would always be another traveler. That made it safe.”',
  'He says it like a boy explaining a broken window. Then the years catch up with his voice. “I did not understand that a promise could learn to collect.”',
  '“I kept paying for the room because I could not bear to put her outside. I let Iona hate the river. It was easier than letting her hate the person who brought the money.”'
 ],[choice('record','I need to see the words you wrote.','record')]),
 record:node(2,'meadow','You','Two versions of a promise',[
  'Orren brings out a folded contract. The ink is thickest where “this crossing” has become “every crossing.” Mara’s name sits below it, pressed into a thumbprint of ferry tar.',
  'He says she marked it from the boat. Under the table, a tin of the same tar has hardened around a wooden stamp.',
  'Outside, a cart crosses the Meadow without stopping. You understand why he has spent twenty-eight years listening for that sound.'
 ],[choice('seal','Inspect the stamp and take a rubbing.','record_proof'),choice('leave','I have enough to find her.','fen',{clue:'Orren admits extending Mara’s promise from one crossing to every crossing.'})]),
 record_proof:node(2,'meadow','Orren','The thumb that never touched the page',[
  'The stamp fits Mara’s mark exactly. A split across the wood explains a line that every copied signature shares. She never touched this contract.',
  'Orren does not try to stop you taking the rubbing. “Do you think I have not wanted someone to find that?”',
  '“Wanting to be caught is not the same as telling her,” you say. He sits down. After a long time, he agrees.'
 ],[choice('proof','Keep the proof. Go to the Fen.','fen',{set:{forgery:true},clue:'The wooden stamp forged Mara’s assent. The extended contract was never hers.'})]),
 fen:node(3,'fen','You','A river that remembers the wrong night',[
  'At the abandoned ferry, the reeds lean against a wind you cannot feel. A brass bell hangs above the landing. Its rope ends in dry air three feet above the mud.',
  'Through the water you see a supper table. Two glasses. A child’s coat over a chair. Something moves between the table and the far bank each time the bell turns.',
  'Your companion refuses the first step onto the landing. Not fear, you think. Recognition. Someone has made the same mistake here so often that it has become a path.'
 ],[choice('boat','Search the stranded boat.','boat'),choice('bell','Read the words on the bell.','bell')]),
 boat:node(3,'fen','You','The missing seventh passenger',[
  'Six passenger tokens lie nailed beneath a thwart. The seventh has been cut in half. One piece is stamped ORREN. The other is blank.',
  'The blank half is warm. When you lift it, the river shows a young man walking away from the ferry, then an old man paying for a room. Neither turns around.',
  'The contract counts bodies that crossed. It has never counted the ferrier. Its “last traveler” is the woman doing the carrying.'
 ],[choice('save','Keep the broken token.','fen',{set:{token:true},clue:'The contract never counts Mara among the travelers. It cannot finish while she remains on the ferry.'})]),
 bell:node(3,'fen','You','A sentence with no full stop',[
  'The bell does not ask for worship. Its inscription asks for a witness. Under the public vow, in smaller letters, someone has scratched: A burden may be shared by those who hear its terms.',
  'You speak it aloud. For a moment there are many ropes above the water, each leading to a different hand. Then only Mara’s remains.',
  'A figure in a ferrier’s coat rises from the landing. Its face is made of names. When it speaks, it uses Orren’s frightened young voice: “We cannot afford for her to stop.”'
 ],[choice('ready','Face the witness made from the bargain.','ferry_guard',{set:{sharing:true},clue:'The original ward allows informed volunteers to share its burden. That clause was never offered to anyone.'}),choice('boat','Search the boat before approaching.','boat')]),
 ferry_guard:node(3,'fen','The Borrowed Witness','Break the echo, not the woman',[
  'The thing wears Mara’s work coat, but it keeps its hands closed. She would have needed both to row.',
  'It is an echo enforced by the contract, not Mara’s soul. Defeat it to reach the memory behind the landing. It cannot be captured. Your chosen companion and equipped tavern gear come with you; prepared bed and drink bonuses stay reserved for the cellar.',
  'You can withdraw and return. The story does not charge a stake or consume your companions.'
 ],[],{battle:'ferry',next:'mara'}),
 mara:node(4,'fen','Mara','Someone has kept the supper warm',[
  'Beyond the broken echo is a room with no walls. Mara sits at Drew’s table wearing a coat patched with little blue stitches. The supper before her is untouched.',
  '“Iona?” she asks. Then she sees you properly. “No. Of course not. How long?”',
  'You tell her twenty-eight years. She asks you to say it again. Outside this impossible room, the ferry bell rings. Mara puts her hands over her ears until it stops.'
 ],[choice('button','Iona kept the blue button.','mara_button',{requires:['button']}),choice('daughter','Your daughter is grown. She is waiting for an answer.','mara_daughter')]),
 mara_button:node(4,'fen','Mara','The right coat',[
  'Mara laughs once, then begins to cry without making a sound. “She was always taking the wrong coat. Bigger pockets, you see. Thought she could fit more world in them.”',
  'She asks about Iona’s hands. You tell her about the needle. She closes her own hands around the air where her daughter’s would be.',
  '“Thank you for bringing me something she is. Everyone else brings me what I was.”'
 ],[choice('stay','Let her finish before asking about the promise.','mara_daughter',{set:{heard:true}})]),
 mara_daughter:node(4,'fen','Mara','What the hero asked for',[
  '“I promised one crossing. I knew it might be my last. I did not promise every night after it.” She remembers Orren’s voice, the god’s answer, the six people stepping ashore.',
  '“I can feel the years waiting outside. If I leave, I will be old. Iona will be a stranger with my daughter’s eyes. I am frightened of that. I want it anyway.”',
  'She steadies the untouched glass. “If there is a way to keep the road safe without keeping me here, find it. If there isn’t, don’t put new words in my mouth.”'
 ],[choice('consent','I will tell them what you actually want.','return',{set:{consent:true},clue:'Mara never consented to the endless ward. She wants an ordinary life with Iona, including its lost years.'})]),
 return:node(4,'town','Drew','Who was paying the room?',[
  'Drew listens without polishing a glass or looking away. When you finish, he takes the untouched supper off the counter.',
  '“I could keep a door for her,” he says. “I could not make the people on either side walk through it.”',
  'The god waits at the table. Orren stands near the exit. Iona arrives carrying the coat. None of them can now pretend they came for something else.'
 ],[choice('god','Ask the god what they received from the bargain.','god_account')]),
 god_account:node(5,'town','{god}','The other side of the ledger',['{motive}','Iona looks from the god to Orren. “You both had twenty-eight years to ask her.” Nobody answers quickly enough.'],[choice('blame','You benefited. That makes this your responsibility too.','god_reply',{set:{judgment:'responsibility'}}),choice('help','You can help now. But she sets the terms.','god_reply',{set:{judgment:'repair'}})]),
 god_reply:node(5,'town','{god}','A god without an excuse',['{reply}','Drew places three empty glasses beside Mara’s untouched one. “Before anyone makes another arrangement,” he says, “let us try having everyone in the room.”'],[choice('witness','Tell Iona and Orren what you found.','testimony')]),
 testimony:node(5,'town','Iona','No more beautiful versions',[
  'You tell them about the room without walls, Mara’s fear of the years, and her wish to leave. Iona does not ask whether she will look the same. She asks whether the window in her lodgings is wide enough for morning light.',
  'Orren says he can mend it. Iona turns on him. “You can begin by saying what you did without putting the flood at the front of the sentence.”',
  'He tries twice. The third time he says: “I used her name because I was afraid. I let her pay for my fear.”'
 ],[choice('public','The town deserves his full account.','witnesses',{set:{orrensFate:'public'}}),choice('daughter','Let Iona decide who hears his confession first.','witnesses',{set:{orrensFate:'iona'}})]),
 witnesses:node(5,'town','Iona','A burden with more than one handle',[
  'You explain the original ward. It can end, be renewed for a stated term, or—if the omitted clause can be proved—be carried by willing witnesses who know its cost.',
  '“No children,” Iona says immediately. “No debts bought from hungry people. No one volunteered by their family.” Orren nods before she has finished. She makes him say the words aloud.',
  'Drew writes them down. Mara’s glass fogs from the other side. A fingertip traces one word: ASK.'
 ],[choice('review','Review the evidence and the costs.','decision')]),
 decision:node(6,'town','You','The choice nobody can make for her',[
  'Mara speaks through the glass. She will accept a single final winter if it is the only way to prepare a safer crossing. She would rather come home now. She will share a watch with willing adults if nobody is made to stay forever.',
  'The god warns that rewriting the ward will wake its collector. It learned to treat every changed word as an unpaid debt. Whatever you choose, you will have to get past it.',
  'This decision sets the ending. The quest and its soul-droplet reward can be completed on every route. No inventory item or companion is being offered to the contract.'
 ],[
  choice('release','End the ward. Mara comes home; the town must face an unprotected crossing.','collector',{set:{ending:'release'},confirm:'End Mara’s binding now? She returns with the years she lost. The crossing loses its old ward; Iona and Orren must organize a mortal watch. This fixes your story ending.'}),
  choice('winter','Accept Mara’s one-winter term. Safety now, more time apart.','collector',{set:{ending:'winter'},confirm:'Renew the ward for one final winter with Mara’s stated consent? Iona can visit her through Room Seven, but Mara stays at the crossing until that term ends. This fixes your story ending.'}),
  choice('share','Use the omitted clause. A voluntary shared watch, with the full truth recorded.','collector',{requires:['forgery','sharing','consent'],set:{ending:'share'},confirm:'Replace the endless binding with a voluntary shared watch? Mara comes home; Iona, Orren and the named adults each owe an evening by agreement. The watch may fail if they abandon it. This fixes your story ending.'})
 ],{missing:'The shared-watch route needs the forged-seal proof from Orren, the bell’s omitted clause, and Mara’s own wishes. Review your journal before committing.'}),
 collector:node(6,'town','The Collector','A debt that learned to walk',[
  'The room key turns by itself. Beyond Room Seven, the ferry bell is tolling with no pause between strokes. The collector climbs out of the written contract one letter at a time.',
  'It has no face to shame, no childhood to remember, no life to bargain for. It knows only that someone has stopped paying in the way it expects.',
  'Defeat the collector to carry your chosen terms through the door. Withdrawing does not change your decision; you can return and try again. These echoes cannot be captured.'
 ],[],{battle:'collector',next:'ending'}),
 ending_release:node(7,'town','Mara','Morning has a price',[
  'When the bell breaks, Mara stumbles through the doorway. Her hair grays at the temples in the space of a breath. Her hands keep the shape of the oars for a little longer.',
  'Iona catches her, then steps back because they are strangers as well as mother and daughter. “I don’t like pears,” Mara says helplessly. “I remember,” Iona answers. They laugh at how little and how much that is.',
  'Outside, the Fen road loses its impossible stillness. Orren takes the first watch. No miracle guarantees the crossing now. For the first time, the people using it will have to notice what keeps it safe.'
 ],[choice('later','Return the following evening.','letter_release')]),
 ending_winter:node(7,'town','Mara','One winter, written in full',[
  'Mara writes the new term herself. Iona makes a copy. Drew refuses payment for Room Seven until the last day of winter. When the god offers to witness, Mara asks Iona instead.',
  'The road remains quiet. Through the room’s window, mother and daughter sit on opposite sides of the same table. Their first conversation is about a neighbor neither of them likes.',
  'It is not freedom yet. Mara has chosen a limit, and everyone has promised to honor it. Iona leaves the coat on the chair rather than taking it home again.'
 ],[choice('later','Return the following evening.','letter_winter')]),
 ending_share:node(7,'town','Mara','Many hands, no closed fist',[
  'Drew reads every name and every term. Each witness answers for themself. When the last person agrees, the single rope above the ferry becomes a handful of ordinary cords.',
  'Mara steps through the doorway and grows older in Iona’s arms. Orren takes five watches, freely offered. Iona takes one and refuses to call it forgiveness. The others each take an evening they can afford.',
  'The god cannot promise they will keep doing it. That is the frightening part. The hopeful part is that, this time, no one has been made invisible to keep the arrangement simple.'
 ],[choice('later','Return the following evening.','letter_share')]),
 letter_release:node(7,'town','Drew','The first ordinary complaint',[
  'A note waits under your glass. Iona says her mother snores. Mara says her daughter burns toast. They have already argued over who gets the chair nearest the window.',
  'A cart arrived late from the Fen. Its driver complained about the new watch and then stayed to help repair the landing. The road is less convenient. It is still a road.',
  'Drew reads the note after you offer it. “Good,” he says. “They have reached the part the songs never bother with.”'
 ],[choice('god','Speak to the god one last time.','farewell')]),
 letter_winter:node(7,'town','Drew','A calendar by the window',[
  'Iona has pinned a calendar beside Room Seven. The first square is crossed out in her hand, the second in Mara’s. Neither lets visitors describe the marks as a countdown to a miracle.',
  'Orren has begun rebuilding the landing for spring. He works where people can see him. Nobody has asked him to make a speech.',
  'Drew brings two suppers upstairs. One comes back eaten. “A beginning,” he says when you notice. He does not call it an ending.'
 ],[choice('god','Speak to the god one last time.','farewell')]),
 letter_share:node(7,'town','Drew','The watch changes hands',[
  'The first argument arrives before the first missed watch. Someone has work at dawn; someone else has a bad knee. Iona produces the terms and insists that asking for a swap is not the same as deserting.',
  'Orren offers another night. Mara tells him that making himself indispensable would be an excellent way to repeat his mistake. He takes his coat off and listens.',
  'Drew puts a fresh sheet of paper beside the watch list. There is room for changes. Nobody has signed away that right.'
 ],[choice('god','Speak to the god one last time.','farewell')]),
 farewell:node(7,'town','{god}','A small thing even a god cannot take back',[
  '{farewell}',
  'A single droplet gathers between the god’s fingers. It holds its shape after it falls, bright enough to cast a second shadow beneath your glass.',
  '“This is part of me. I do not yet know what you will need it for. I will not tell you that makes it harmless.” Drew brings a stoppered vial. “Then label it honestly,” he says.'
 ],[choice('claim','Accept the Droplet of {god}’s Soul.','complete',{reward:true})]),
 complete:node(7,'town','Your journal','The guest who could leave',[
  'Mara’s story has an ending in your journal. What follows it belongs to the people who have to live there.',
  'The god’s soul droplet is a unique keepsake reserved for a later use. It cannot be consumed, discarded, sold to an NPC or wagered. You may deliberately list it in your player shop; a sale transfers the same droplet, and the quest will not award a replacement.',
  'You can reread the evidence and your choices below. Drew has put an ordinary key on the hook for Room Seven.'
 ],[])
};
module.exports={gods,nodes,title:'The Guest Who Never Left'};
