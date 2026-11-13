// UNS developmental framework: the single source of truth for the five dimensions, their objectives,
// and the classification of every activity. Used by index.html, tests, and tools/gen_framework.js.
// Rules: an activity's dimensions are DERIVED from its objectives (no decorative tags); `pri` is its primary dimension.
// These are play and learning activities. Nothing here measures, tests or diagnoses a child.
const BANDS=['7-8','9-10','11-12'];
const DIMS=[
 ['cog','🧠','النمو المعرفي','Cognitive development','الذاكرة والانتباه والتفكير وحل المشكلات والإبداع.','Memory, attention, thinking, problem-solving and creativity.','blue'],
 ['emo','💗','النمو العاطفي والنفسي','Emotional and psychological development','فهم المشاعر والتعبير عنها وتنظيمها، والمرونة والثقة بالنفس.','Understanding, expressing and regulating feelings, resilience and confidence.','pink'],
 ['soc','🤝','النمو الاجتماعي','Social development','التواصل والتعاطف والتعاون والاحترام وحل الخلافات.','Communication, empathy, cooperation, respect and resolving conflict.','peach'],
 ['phy','🖐️','النمو البدني والحركي','Physical and motor development','التآزر والتوازن والمهارات الحركية والعادات البدنية الصحية.','Coordination, balance, motor skills and healthy physical habits.','mint'],
 ['lif','🌱','مهارات الحياة','Life skills','الاستقلالية والمسؤولية واتخاذ القرار والتنظيم والسلامة والعادات الصحية.','Independence, responsibility, decisions, organization, safety and healthy habits.','lav']];
const OBJ={
 memory:['cog','الذاكرة','Memory'],attention:['cog','الانتباه','Attention'],concentration:['cog','التركيز','Concentration'],reasoning:['cog','التفكير المنطقي','Logical reasoning'],creativity:['cog','الإبداع','Creativity'],critical:['cog','التفكير الناقد','Critical thinking'],problem:['cog','حل المشكلات','Problem-solving'],
 recognition:['emo','التعرّف على المشاعر','Recognizing emotions'],expression:['emo','التعبير عن المشاعر','Expressing emotions'],awareness:['emo','الوعي بالمشاعر','Emotional awareness'],regulation:['emo','تنظيم المشاعر','Emotional regulation'],resilience:['emo','المرونة النفسية','Resilience'],confidence:['emo','الثقة بالنفس','Confidence'],esteem:['emo','تقدير الذات','Self-esteem'],
 communication:['soc','التواصل','Communication'],empathy:['soc','التعاطف','Empathy'],cooperation:['soc','التعاون','Cooperation'],friendship:['soc','الصداقة','Friendship'],respect:['soc','الاحترام','Respect'],teamwork:['soc','العمل الجماعي','Teamwork'],conflict:['soc','حل الخلافات','Conflict resolution'],
 coordination:['phy','التآزر بين العين واليد','Hand-eye coordination'],balance:['phy','التوازن','Balance'],finemotor:['phy','المهارات الحركية الدقيقة','Fine motor skills'],grossmotor:['phy','المهارات الحركية الكبرى','Gross motor skills'],movement:['phy','الحركة','Movement'],physhabits:['phy','العادات البدنية الصحية','Healthy physical habits'],
 independence:['lif','الاستقلالية','Independence'],responsibility:['lif','المسؤولية','Responsibility'],decision:['lif','اتخاذ القرار','Decision-making'],organization:['lif','التنظيم','Organization'],timemgmt:['lif','إدارة الوقت','Time management'],safety:['lif','السلامة الشخصية','Personal safety'],habits:['lif','العادات الصحية','Healthy habits']};
const TYPES=[['game','🎮','لعبة','Game'],['creative','🎨','إبداع','Creative'],['story','📖','قصة','Story'],['learn','📚','تعلّم','Learning'],['express','💬','تعبير وتواصل','Express and communicate'],['care','🐾','رعاية ولعب أدوار','Care and role-play']];
const ALL=['7-8','9-10','11-12'];
const A=(id,view,ic,t,type,pri,objs,ages,how,acad)=>({id,view,ic,t,type,pri,objs,ages,how,acad});
const ACT=[
 A('memory','mem','🃏',['ذاكرة البطاقات','Memory Cards'],'game','cog',['memory','attention','concentration'],['7-8','9-10'],['تتدرّب على تذكّر أماكن البطاقات والانتباه للعبة.','Practises remembering where cards are and paying attention to the game.']),
 A('match','match','🧩',['طابق الصورة بالكلمة','Match the Picture'],'game','cog',['attention','memory'],['7-8'],['تربط الصورة باسمها، فتتدرّب على الانتباه والتذكّر.','Links each picture to its name, practising attention and recall.']),
 A('puzzle','puzzle','🖼️',['لعبة البازل','Puzzle Game'],'game','cog',['reasoning','problem','concentration','finemotor','coordination'],ALL,['تخطّط لمكان كل قطعة وتحرّكها، فتتدرّب على حل المشكلات والتفكير البصري. اختر قطعًا أكثر لتحدٍّ أكبر (2–9 للأصغر، 9–25 للأوسط، 25–49 للأكبر).','Plans where each piece goes and moves it, practising problem-solving and visual reasoning. More pieces means a bigger challenge (2–9 younger, 9–25 middle, 25–49 older).']),
 A('coloring','album','🖌️',['ألبوم التلوين','Coloring Album'],'creative','phy',['finemotor','coordination','creativity','expression'],['7-8','9-10'],['تلوّن بحرية، فتتدرّب على التحكم بحركة اليد وتختار الألوان للتعبير عن نفسك.','Free colouring practises hand control and lets you choose colours to express yourself.']),
 A('drawing','draw','🖍️',['لوحة الرسم','Drawing Canvas'],'creative','emo',['expression','creativity','finemotor','coordination'],ALL,['ترسم ما تشعر به أو تتخيّله، فتتدرّب على التعبير والإبداع وحركة اليد.','Draw what you feel or imagine, practising expression, creativity and hand control.']),
 A('story','story','☁️',['قصة تفاعلية','Interactive Story'],'story','emo',['awareness','empathy','decision'],['7-8','9-10'],['تختار ما يفعله البطل مع غيمة حزينة، فتفكّر في مشاعر الآخرين وتتدرّب على الاختيار.','You choose what the hero does for a sad cloud, thinking about others’ feelings and practising choices.']),
 A('feelings','feel','💗',['مشاعري','My Feelings'],'express','emo',['recognition','expression','awareness','communication'],ALL,['تتعرّف على مشاعرك وتسمّيها وتخبر من تثق به بما تحتاج.','Notice and name your feelings, and tell someone you trust what you need.']),
 A('health','health','🩹',['صحتي','My Health'],'express','lif',['safety','communication','independence'],ALL,['تتعلّم أن تصف ما يشعر به جسمك وتخبر شخصًا كبيرًا، ويمكنك الرسم على مجسم جسم لتحديد المكان. هذه وسيلة للتواصل وليست اختبارًا.','Learn to describe how your body feels and tell a grown-up, and draw on a body model to show where. It is a way to communicate, not a test.']),
 A('wishes','wish','🌸',['أمنياتي الصغيرة','My Little Wishes'],'express','lif',['decision','communication','independence'],ALL,['تختار ما تتمنّاه وتطلبه بكلماتك، فتتدرّب على اتخاذ القرار والتعبير عن حاجاتك.','Choose what you wish for and ask for it, practising decisions and speaking up for your needs.']),
 A('people','people','👨‍👩‍👧',['ناسي','My People'],'express','soc',['communication','cooperation'],ALL,['تتواصل مع عائلتك وتجرّب أنشطة مشتركة مثل الرسم معًا.','Stay in touch with your family and try shared activities such as drawing together.']),
 A('pets','pets','🐾',['حيواناتي الأليفة','My Pets'],'care','lif',['responsibility','empathy','decision','habits'],ALL,['تعتني بحيوانك: تختار طعامه ونظافته وراحته، فتتدرّب على المسؤولية وملاحظة احتياجات الآخرين.','Care for your pet by choosing food, cleaning and rest, practising responsibility and noticing others’ needs.']),
 A('journey','jour','🗺️',['رحلتي','My Journey'],'express','emo',['awareness','esteem','confidence'],ALL,['ترى ما صنعته وتتذكّره، فيدعم ذلك فخرك بعملك.','Looking back at what you made supports pride in your own work.']),
 A('acad-0','acad','🫀',['لماذا ينبض قلبي؟','Why does my heart beat?'],'learn','cog',['memory','independence'],ALL,['تتعلّم كيف يعمل قلبك وتتذكّر ما تعلّمته في سؤال قصير.','Learn how your heart works and recall it in a short question.'],0),
 A('acad-1','acad','🏥',['غرفتي في المستشفى','My hospital room'],'learn','emo',['resilience','communication','independence'],ALL,['تتعرّف على غرفة المستشفى وتعرف أنك تستطيع أن تسأل عن أي شيء، فتستعدّ لموقف جديد.','Get to know a hospital room and learn you can ask about anything, preparing for a new situation.'],1),
 A('acad-2','acad','🌡️',['لماذا يقيس الممرض حرارتي؟','Why do nurses check my temperature?'],'learn','cog',['reasoning','independence'],ALL,['تفهم لماذا يقيس الممرض الحرارة وما علاقتها بجسمك.','Understand why a nurse checks temperature and how it relates to your body.'],2),
 A('acad-3','acad','🧑‍⚕️',['من هو ممرضي؟','Who is my nurse?'],'learn','soc',['communication','respect','confidence'],ALL,['تتعرّف على دور الممرض وتتدرّب على إخباره عمّا يقلقك.','Learn what a nurse does and practise telling them what worries you.'],3),
 A('acad-4','acad','🩸',['ما هو فحص الدم؟','What is a blood test?'],'learn','emo',['regulation','communication','resilience'],ALL,['تعرف ما قد تشعر به في فحص الدم وأنك تستطيع أن تسأل، فتستعدّ بهدوء.','Learn what a blood test may feel like and that you can ask questions, to prepare calmly.'],4),
 A('acad-5','acad','💊',['من يقرر دوائي؟','Who decides my medicine?'],'learn','lif',['safety','responsibility'],ALL,['تتعلّم أن الطبيب والممرض هما من يقرران الدواء، وأن لا تأخذ دواءً وحدك.','Learn that your doctor and nurse decide your medicine and that you never take medicine alone.'],5),
 A('acad-6','acad','🧼',['غسل اليدين','Washing my hands'],'learn','lif',['habits','physhabits','independence'],ALL,['تتعلّم خطوات غسل اليدين كعادة صحية يومية.','Learn how to wash your hands as a daily healthy habit.'],6),
 A('acad-7','acad','💗',['عندما أشعر بالقلق','When I feel worried'],'learn','emo',['awareness','regulation','expression','communication'],ALL,['تتعلّم أن القلق شعور طبيعي وما الذي يمكنك فعله حين تشعر به.','Learn that worry is a normal feeling and what you can do when you feel it.'],7)];
ACT.forEach(a=>{a.dims=[a.pri].concat([...new Set(a.objs.map(o=>OBJ[o][0]))].filter(d=>d!==a.pri))});

// How each activity adapts. perf = level follows how the child plays (and age sets the first level); age = content/wording changes with age; ui = wording and layout only.
const _P=['يتكيّف مع طريقة لعبك: يتغيّر المستوى تدريجيًا، ويمكنك اختيار أي مستوى.','Adapts to how you play: the level changes gradually, and you can pick any level.'];
const ADAPT={
 memory:['perf','عدد الأزواج (3–12) يتبع طريقة لعبك، ويمكنك اختيار أي عدد.','The number of pairs (3–12) follows how you play, and you can pick any number.'],
 match:['perf','عدد الخيارات وصعوبة الصور يتبعان طريقة لعبك، ويمكنك اختيار أي مستوى.','The number of choices and the picture difficulty follow how you play, and you can pick any level.'],
 puzzle:['perf','يقترح عدد القطع بحسب أدائك، ويمكنك اختيار أي عدد من 2 إلى 49.','Suggests a number of pieces from how you play, and you can pick any number from 2 to 49.'],
 coloring:['age','ترتيب الصور بحسب العمر وتفاصيلها، وكلها متاحة لك.','Pictures are ordered by age and detail, and all are available to you.'],
 drawing:['age','أفكار الرسم وحجم الفرشاة المبدئي يناسبان عمرك.','Drawing ideas and the starting brush size suit your age.'],
 story:['age','يضيف سؤال تأمّل للأكبر سنًا.','Adds a reflection question for older children.'],
 feelings:['ui','صياغة التعليمات والشكل تناسب عمرك، والمحتوى نفسه متاح للجميع.','Wording and layout suit your age; the content is the same for everyone.'],
 health:['ui','صياغة السؤال عن الجسم ومجسم الجسم يناسبان عمرك. مقياس الألم وتعليمات السلامة ثابتة لا تتغير.','The body question and the body model suit your age. The pain scale and safety instructions never change.'],
 wishes:['ui','صياغة التعليمات والشكل تناسب عمرك.','Wording and layout suit your age.'],
 people:['ui','الشكل يناسب عمرك.','Layout suits your age.'],
 pets:['ui','الشكل يناسب عمرك.','Layout suits your age.'],
 journey:['ui','الشكل يناسب عمرك.','Layout suits your age.']};
for(let k=0;k<8;k++)ADAPT['acad-'+k]=['perf','يضيف سؤالًا أعمق وتفكيرًا حرًّا بحسب أدائك، ويمكنك طلبه في أي وقت.','Adds a deeper question and a reflection prompt as you do well, and you can ask for it any time.'];
