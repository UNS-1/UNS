// UNS personalization engine for ages 7-12.
// Age sets the STARTING point and the PRESENTATION (wording, layout, content depth).
// Performance moves the LEVEL. Nothing here restricts access: every level, size and activity stays selectable.
// These are play settings. They are not tests, scores, assessments or diagnoses.
const AGES=['7-8','9-10','11-12'];
const LEGACY_AGE={'5-7':'7-8','8-10':'9-10'};          // values already stored for existing accounts
const normAge=a=>AGES.includes(a)?a:(LEGACY_AGE[a]||'');
const AGEP={
 '7-8':{ic:'🌱',name:['اكتشاف','Discovery'],desc:['نتعرّف على أشياء جديدة بخطوات قصيرة وواضحة.','Trying new things in short, clear steps.'],brush:12},
 '9-10':{ic:'🧭',name:['استكشاف','Exploration'],desc:['نستكشف ونبني مهارات بتحدٍّ متوسط.','Exploring and building skills with a medium challenge.'],brush:8},
 '11-12':{ic:'🚀',name:['استقلالية','Independence'],desc:['نختار بأنفسنا ونجرّب تحديات أكبر.','Choosing for yourself and trying bigger challenges.'],brush:5}};
const GAMES={                                            // start = level used for the very first play; up/down = score thresholds
 puzzle:{max:7,start:{'7-8':2,'9-10':3,'11-12':4},up:.7,down:.35},
 memory:{max:6,start:{'7-8':1,'9-10':2,'11-12':3},up:.5,down:.22},
 match:{max:4,start:{'7-8':1,'9-10':2,'11-12':3},up:.84,down:.5},
 quiz:{max:3,start:{'7-8':1,'9-10':2,'11-12':2},up:1,down:0,place:false}};   // two-option questions are right half the time by guessing: no single-result placement
const PUZ_PIECES=[4,6,9,16,25,36,49], MEM_PAIRS=[3,4,6,8,10,12], MEM_COLS=[3,4,4,4,5,6];
const MEM_EMO=['🐱','🐶','🐟','🐦','🐰','🦋','🐢','🦊','🐼','🦄','🐸','🐝'];
const puzLevelOf=pieces=>PUZ_PIECES.reduce((b,p,i)=>Math.abs(p-pieces)<Math.abs(PUZ_PIECES[b]-pieces)?i:b,0)+1;
function newProfile(){return{levels:{},recent:{},settings:{challenge:'auto',hints:null}}}
function levelOf(p,game,age){const L=p.levels[game];return L||GAMES[game].start[normAge(age)||'9-10']}
// record(): score 0..1 for the level that was actually played. `played` lets a child who chose a different level still be judged fairly.
function record(p,game,score,helped,age,played){
 const g=GAMES[game],rec=(p.recent[game]=p.recent[game]||[]),first=p.levels[game]==null,from=played||levelOf(p,game,age);
 rec.push({s:Math.round(score*100)/100,h:!!helped});while(rec.length>5)rec.shift();
 if(p.settings.challenge==='keep'){p.levels[game]=p.levels[game]||from;return{from,level:p.levels[game],change:0,kept:true}}
 const strong=r=>r.s>=g.up&&!r.h,l2=rec.slice(-2),l3=rec.slice(-3);let change=0;
 if(g.place!==false&&first&&rec.length===1&&score>=Math.min(1,g.up+.2)&&!helped)change=1;                          // placement: a very strong first try moves past the age start
 else if(l3.length===3&&l3.every(r=>strong(r)&&r.s>=Math.min(1,g.up+.15)))change=2;
 else if(l2.length===2&&l2.every(strong))change=1;
 else if(l2.length===2&&l2.every(r=>r.s<=g.down))change=-1;
 const L=Math.max(1,Math.min(g.max,from+change));if(L!==from||change)p.recent[game]=[];
 p.levels[game]=L;return{from,level:L,change:Math.sign(L-from),kept:false}}
function setLevel(p,game,L){p.levels[game]=Math.max(1,Math.min(GAMES[game].max,Math.round(L)));p.recent[game]=[]}
function permMinSwaps(o){const seen=new Set();let cyc=0;for(let i=0;i<o.length;i++){if(seen.has(i))continue;cyc++;let j=i;while(!seen.has(j)){seen.add(j);j=o[j]}}return o.length-cyc}
const hintsDefault=age=>normAge(age)!=='11-12';
function hintsOn(p,age){return p.settings.hints==null?hintsDefault(age):!!p.settings.hints}
// Settings that came from storage or the server are never trusted.
function cleanProfile(x){const p=newProfile();if(!x||typeof x!=='object')return p;
 for(const g in GAMES){const L=Math.round(+(x.levels||{})[g]);if(L>=1&&L<=GAMES[g].max)p.levels[g]=L;
  const r=(x.recent||{})[g];if(Array.isArray(r))p.recent[g]=r.slice(-5).map(o=>({s:Math.max(0,Math.min(1,+o.s||0)),h:!!o.h}))}
 const s=x.settings||{};if(s.challenge==='keep')p.settings.challenge='keep';if(typeof s.hints==='boolean')p.settings.hints=s.hints;return p}
// ---- matching game: picture bank grows by tier; options grow by level
const MATCHPOOL=[
 ['cat','🐱','قطة','Cat',1],['dog','🐶','كلب','Dog',1],['fish','🐟','سمكة','Fish',1],['bird','🐦','طائر','Bird',1],['rabbit','🐰','أرنب','Rabbit',1],['duck','🦆','بطة','Duck',1],
 ['apple','🍎','تفاحة','Apple',2],['banana','🍌','موزة','Banana',2],['car','🚗','سيارة','Car',2],['house','🏠','بيت','House',2],['flower','🌸','زهرة','Flower',2],['sun','☀️','شمس','Sun',2],
 ['turtle','🐢','سلحفاة','Turtle',3],['butterfly','🦋','فراشة','Butterfly',3],['rocket','🚀','صاروخ','Rocket',3],['moon','🌙','قمر','Moon',3],['tree','🌳','شجرة','Tree',3],['book','📖','كتاب','Book',3],
 ['elephant','🐘','فيل','Elephant',4],['giraffe','🦒','زرافة','Giraffe',4],['tent','⛺','خيمة','Tent',4],['telescope','🔭','تلسكوب','Telescope',4],['microscope','🔬','مجهر','Microscope',4],['bridge','🌉','جسر','Bridge',4]];
const MATCH_OPTS=[3,3,4,5], MATCH_ROUNDS=6;
function buildMatch(level,rng){rng=rng||Math.random;const sh=a=>a.map(x=>[rng(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
 const pool=MATCHPOOL.filter(m=>m[4]<=level),top=pool.filter(m=>m[4]===level),rest=pool.filter(m=>m[4]<level),n=MATCH_ROUNDS;
 const items=sh(top).slice(0,level>1?Math.ceil(n/2):n).concat(sh(rest)).concat(sh(top)).filter((m,i,a)=>a.indexOf(m)===i).slice(0,n);
 return sh(items).map(it=>({item:it,opts:sh([it].concat(sh(pool.filter(m=>m!==it)).slice(0,MATCH_OPTS[level-1]-1)))}))}
// ---- academy: a deeper question for higher quiz levels; a reflection prompt for the highest
const ACX=[
 ['أين يمكنك أن تشعر بنبض قلبك؟','Where can you feel your heartbeat?',['على صدرك أو معصمك','On your chest or wrist'],['في أذنك فقط','Only in your ear']],
 ['من يمكنه مساعدتك إذا احتجت شيئًا في غرفتك؟','Who can help you if you need something in your room?',['الممرض أو أهلي','My nurse or my family'],['لا أحد','No one']],
 ['ماذا قد يعني أن حرارة الجسم أعلى من المعتاد؟','What can a higher body temperature mean?',['قد يكون جسمي يتعامل مع مرض','My body may be dealing with an illness'],['أن عليّ الركض فورًا','That I must run right away']],
 ['ما الذي يفعله الممرض لمساعدتك؟','What does a nurse do to help you?',['يتابع حالتي ويستمع إليّ','Checks on me and listens to me'],['يختار ألعابي فقط','Only chooses my toys']],
 ['ما الذي قد يساعدك أثناء الفحص؟','What may help during the test?',['أن أسأل وأن يبقى معي شخص أثق به','Asking questions and having someone I trust with me'],['أن أخفي خوفي','Hiding my fear']],
 ['ماذا تفعل إن وجدت دواءً في المنزل؟','What do you do if you find medicine at home?',['أخبر شخصًا كبيرًا ولا آخذه','Tell a grown-up and do not take it'],['أجرّبه لأرى','Try it to see what happens']],
 ['متى نغسل أيدينا؟','When should we wash our hands?',['قبل الأكل وبعد استعمال الحمّام','Before eating and after using the toilet'],['في الصباح فقط','Only in the morning']],
 ['هل من المقبول أن نشعر بمشاعر مختلفة؟','Is it okay to have different feelings?',['نعم، كل المشاعر مقبولة','Yes, all feelings are okay'],['لا، يجب أن أكون سعيدًا دائمًا','No, I must always be happy']]];
const REFLECT=['فكّر: ما الذي تودّ أن تسأله لممرضك عن هذا الموضوع؟','Think: what would you like to ask your nurse about this?'];
// ---- creative prompts and story reflection by age
const DRAW_PROMPTS={
 '7-8':[['ارسم حيوانك المفضل.','Draw your favorite animal.'],['ارسم شيئًا يجعلك سعيدًا.','Draw something that makes you happy.'],['ارسم بيتًا بحديقة.','Draw a house with a garden.'],['ارسم الشمس والغيوم.','Draw the sun and clouds.']],
 '9-10':[['ارسم مشاعرك اليوم على شكل طقس (شمس، غيوم، مطر).','Draw how you feel today as weather (sun, clouds, rain).'],['ارسم مكانًا تحب أن تزوره.','Draw a place you would like to visit.'],['ارسم اختراعًا يساعد الناس.','Draw an invention that helps people.'],['ارسم صديقًا خياليًا.','Draw an imaginary friend.']],
 '11-12':[['ارسم مكانًا تشعر فيه بالهدوء.','Draw a place where you feel calm.'],['ارسم يومك في ثلاثة مربعات كقصة مصوّرة.','Draw your day in three panels, like a comic.'],['صمّم غرفة أحلامك.','Design your dream room.'],['ارسم شخصية تمثّل نقاط قوتك.','Draw a character that shows your strengths.']]};
const STORY_REFLECT={'9-10':['ماذا كنت ستفعل لو شعر صديقك بالحزن؟','What would you do if a friend felt sad?'],'11-12':['تذكّر وقتًا ساعدك فيه أحد على الشعور بتحسّن. ماذا فعل؟','Think of a time someone helped you feel better. What did they do?']};
// ---- instruction wording by age (9-10 uses the base wording). Pain-scale and safety texts are NEVER changed: validated wording.
const AGEI={
 '7-8':{ar:{hf:'كيف تشعر الآن؟',hw:'ماذا تريد الآن؟',body:'أين في جسمك؟',wnote:'بعض الأمنيات تحتاج وقتًا أو حديثًا، وقد لا تتحقق. سنسمعك دائمًا.',pzhint:'اضغط قطعة، ثم قطعة ثانية لتتبادلا.',albn:'اختر صورة وابدأ التلوين! البسيطة أولًا.',wait:'عالمك الصغير ينتظرك.',bm_how:'اضغط أو ارسم على المكان الذي يزعجك.'},
  en:{hf:'How do you feel now?',hw:'What do you want now?',body:'Where in your body?',wnote:'Some wishes need time or a talk, and some may not happen. We will always listen.',pzhint:'Tap one piece, then another piece, to swap them.',albn:'Pick a picture and start coloring! Simple ones come first.',wait:'Your little world is waiting for you.',bm_how:'Tap or draw on the place that bothers you.'}},
 '11-12':{ar:{hf:'كيف تشعر اليوم؟',hw:'ما الذي قد يساعدك الآن؟ اختر ما يناسبك.',body:'حدّد مكان الإحساس في جسمك.',wnote:'قد تحتاج بعض الأمنيات إلى تخطيط أو حديث، وقد لا تكون ممكنة. سيُقرأ طلبك ويُناقش معك.',pzhint:'بدّل قطعتين لتضعهما في مكانهما. جرّب أقل عدد من التبديلات إن أحببت.',albn:'اختر صورة. الأكثر تفصيلًا أولًا، وكلها متاحة.',wait:'ما الذي تودّ فعله اليوم؟',bm_how:'حدّد المكان بدقة على الجسم بنقطة أو بخط. يمكنك التبديل بين الأمام والخلف.'},
  en:{hf:'How are you feeling today?',hw:'What might help right now? Choose what suits you.',body:'Show where in your body you feel it.',wnote:'Some wishes may need planning or a conversation, and some may not be possible. Your request will be read and discussed with you.',pzhint:'Swap two pieces to put them in place. Try using as few swaps as you like.',albn:'Pick a picture. The most detailed come first, and all are available.',wait:'What would you like to do today?',bm_how:'Mark the exact place on the body with a dot or a line. You can switch between front and back.'}}};
