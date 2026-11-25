# UNS — تصميم دخول الطفل وربط السجل بالممرض والأهل

> **الحالة:** تصميم فقط. لم يُنفَّذ منه شيء، ومقطع SQL في الملحق **لم يُشغَّل ولم يُفحص صياغيًا** (لا PostgreSQL ولا أداة SQL في بيئة العمل). لا يُنقل إلى `backend/` قبل تجربته على مشروع staging.

## 1) القرارات المعتمدة من المستخدم
1. **الدخول:** حساب للطفل يديره ولي الأمر برمز ربط (وليس كلمة سر يحفظها الطفل).
2. **مشروع Supabase تجريبي (staging)** قبل أي تغيير على الحقيقي.
3. إلى حين انتهاء المراحل: ما لا يُربط بعد يبقى في الذاكرة/المتصفح كما هو.
4. **الأهل لا يرون بلاغات الأعراض ولا المشاعر افتراضيًا** (كما في القواعد الحالية `sr_sel`/`ec_sel`). أي ملخص لهم لاحقًا بموافقة صريحة، وأنواعها موجودة أصلًا: `share_feelings_summary` و`share_health_summary`، ويراجعه مختص قبل التنفيذ.
5. **كود لكل طفل يكفي** (ولي الأمر بطفلين = كودان). لا كيان «عائلة» الآن.
6. كل ممرض له أطفال كثيرون، والطفل قد يكون له ممرضون كثيرون (`nurse_assignments`).
7. **الطفل قد يستخدم أكثر من جهاز**، ويلزم رابط بينها: **سجل واحد في الخادم لكل طفل** (`child_id`) تقرأ منه وتكتب إليه كل أجهزته. (قرار جديد من المستخدم يستبدل افتراض «جهاز واحد».)

## 2) النموذج الحالي للربط (من `backend/01_schema.sql` و`02_rls.sql`)
- **سجل الطفل:** `child_profiles` (صف واحد لكل طفل، `id` UUID، و`user_id` فريد اختياري لحساب الطفل).
- **ممرض ↔ طفل:** `nurse_assignments` (كثير لكثير، `active` وتواريخ). الوصول بدالة `is_nurse_of(child)`.
- **ولي أمر ↔ طفل:** `caregiver_relationships` (كثير لكثير، حالة pending/active/revoked). الوصول `is_caregiver_of(child)`.
- **إثبات الربط:** `family_codes` (يولّده ممرض معيّن للطفل: مجزّأ، ينتهي بعد 14 يومًا، 5 محاولات/15 دقيقة، دالة `redeem_family_code`).
- **الطفل نفسه:** `is_child_self(child)` يتطلب `profiles.role='child'` و`child_profiles.user_id = auth.uid()`.
- **الفجوة:** ربط حساب الطفل اليوم يدوي عبر `admin_link_child_user` (المسؤول ينشئ المستخدم). لا يصلح لمستشفى بأطفال كثيرين، ولا يطابق قرار «رمز يديره ولي الأمر».

## 3) المقترح: ربط جهاز الطفل برمز من ولي الأمر
### التدفق (عدة أجهزة)
1. ولي الأمر (دخول حقيقي في `app.html`، ربطه بالطفل فعّال) يضغط «إضافة جهاز لطفلي» ← رمز ربط **لمرة واحدة** (10 خانات مجزّأ، صالح 10 دقائق).
2. على جهاز الطفل تفتح `index.html` شاشة «اربط جهازي»: التطبيق ينفّذ **دخولًا مجهولًا** في Supabase (Anonymous sign-in)، ثم يُدخل الرمز.
3. دالة على الخادم (`security definer`) تتحقق من الرمز (بنفس قفل المحاولات)، فتسجّل هذا المستخدم المجهول كـ**جهاز** في جدول `child_devices` لهذا الطفل، وتجعل دوره `child`، وتكتب في `audit_logs`.
4. **كل جهاز له هوية مصادقة خاصة (مستخدم مجهول خاص به)، لكن كلها تشير إلى نفس `child_id`.** هذا هو «الرابط بين الأجهزة». السياسات الحالية تعتمد على `is_child_self(child)`، فنعدّلها (create or replace، في ملف جديد) لتقبل أي جهاز غير ملغى في `child_devices`. فكل جهاز يرى ويكتب **نفس** سجلات الطفل (الأمنيات، المشاعر، البلاغات، الرسومات...).
5. **الجلسة** تبقى في متصفح الجهاز (لا شيء يحفظه الطفل). ضياع جهاز أو مسح المتصفح ← إلغاء ذلك الجهاز وإضافة غيره برمز جديد، دون المساس ببقية الأجهزة.
6. **إدارة الأجهزة:** ولي الأمر (وكذلك الممرض المعيّن) يرى قائمة أجهزة الطفل (الاسم الذي وُضع عند الربط، وتاريخ الإضافة) ويلغي أي جهاز؛ الإلغاء يوقف ذلك الجهاز فورًا. **سقف مقترح: 5 أجهزة للطفل.**

### كيف تتزامن الأجهزة
- **ما يُحفظ في الخادم يتزامن تلقائيًا** عند فتح التطبيق أو تحديث الشاشة (القراءة من الخادم). سجلات الإضافة فقط (أمنية، مشاعر، بلاغ) لا تتعارض بين جهازين: تُضاف كلها.
- **ما بقي محليًا لا يتزامن** إلى أن ننقله: المهام اليومية، الملصقات والتقدّم، **ناسي (الدائرة)**، والإعدادات المحلية. الاقتراح: ننقل المهام والملصقات والتقدّم والمستويات إلى `child_preferences.settings` (بيانات غير حساسة، آخر كتابة تفوز، ويلزم توسيع التحقق في `validate_child_settings` بملف جديد). أما **ناسي** فتبقى على كل جهاز على حدة افتراضيًا (حساسية الأسماء) إلى أن تقرر غير ذلك.
- لا يوجد «تحديث لحظي» (realtime) في البداية؛ تحديث عند الفتح كافٍ. يمكن إضافته لاحقًا.

### لماذا هذا وليس كلمة سر أو صور؟
- طفل 7–12 لا يُطلب منه حفظ سر قوي. رمز الصور القصير (3 صور من 12 = 1728 احتمالًا) ضعيف كسرّ وحده، لكنه مقبول كـ«قفل واجهة» محلي على الجهاز المربوط (اختياري لاحقًا، وليس أمانًا للخادم).
- لا مفاتيح سرية في الواجهة: كل شيء بالمفتاح العام وRLS ودوال `security definer`.
- لا حاجة لـ`service_role` ولا Edge Functions في هذه المرحلة.

### مخاطر وكيف نخفّفها
| الخطر | التخفيف المقترح |
|---|---|
| إنشاء حسابات مجهولة بكثرة (إساءة) | CAPTCHA (Turnstile) على الدخول المجهول + حدود Supabase + تنظيف دوري لمستخدمين مجهولين غير مربوطين |
| تخمين رمز الربط | 10 خانات + قفل 5 محاولات/15 دقيقة + صلاحية 10 دقائق + مرة واحدة |
| جهاز مشترك في المستشفى | زر «هذا ليس جهازي» (فكّ الربط محليًا) وانتهاء جلسة معقول؛ لا بيانات صحية مخزّنة على الجهاز غير الجلسة |
| مستخدم مجهول يحصل على دور خاطئ | حسابه لا يصبح `child` إلا داخل دالة الربط؛ التحقق من `auth.users.is_anonymous` |
| جهاز ضائع أو مسروق | إلغاء ذلك الجهاز وحده من قائمة الأجهزة (ولي الأمر أو الممرض)، والسقف 5 أجهزة، وتنظيف المستخدمين المجهولين الملغين |

> **اعتبارات قانونية وخصوصية:** موافقة ولي الأمر وحماية بيانات الأطفال حسب بلد التشغيل تحتاج استشارة قانونية. هذا التصميم لا يدّعي توافقًا قانونيًا.

## 4) ما الذي يُحفظ في Supabase ومتى (مقترح مراحل)
| الميزة في الواجهة | الجدول/الحقل | ملاحظة |
|---|---|---|
| الأمنية (جاهزة أو مكتوبة) | `wishes(wish_key, free_text ≤300)`، المكتوبة `wish_key='custom'` | واجهتنا تقصّ عند 200 فهي ضمن الحد |
| ردّ الممرض | `wishes.status` (`seen`/`not_possible`...) + `reviewer_note` | الردود الجاهزة الخمسة تحتاج عمودًا إضافيًا `reply_key` (إضافي فقط) |
| المشاعر | `emotional_checkins` | يرى الطفل والممرض فقط |
| بلاغ الأعراض + المجسّم | `symptom_reports` (+`body_marks` من 08) | يرى الطفل والممرض فقط |
| الرسومات والذكريات | `saved_drawings`، `memories`، Storage | الصور بموافقة `media_photos` |
| مستويات اللعب والفئة العمرية | `child_preferences.settings`، `skill_levels` (07)، `set_child_age_group` | موجود في 07 (لم يُشغَّل بعد) |
| المهام اليومية والملصقات والتقدّم | تبقى في المتصفح في م1–م3، ثم تُنقل إلى `child_preferences.settings` لتتزامن بين الأجهزة | بعد مراجعة؛ تحتاج توسيع التحقق |
| **ناسي (أسماء الدائرة)** | **لا حفظ على الخادم افتراضيًا** | أسماء الناس أكثر حساسية؛ إن أُريد حفظها فبجدول مستقل وبموافقة |

### المراحل (كل مرحلة تُجرَّب على staging قبل الحقيقي)
- **م0 (عليك):** تجهيز staging (القسم 5، والتفصيل الكامل في `STAGING_SETUP.md`).
- **م1:** ربط الجهاز (SQL + واجهة ولي الأمر في `app.html` + شاشة الربط في `index.html`) باختبارات بـSupabase وهمي واختبارات `tests/db`.
- **م2:** مزامنة الأمنيات وردود الممرض.
- **م3:** المشاعر وبلاغ الأعراض (الأكثر حساسية: مراجعة سريرية قبل الإطلاق الحقيقي).
- **م4:** الرسومات والذكريات والإعدادات والمستويات.
- **م5:** (اختياري) ملخصات للأهل بموافقة، ولوحة تمريض لأطفال كثيرين مع فرز.

## 5) م0: تجهيز staging (ما أحتاجه منك) — **الترتيب الصحيح للملفات: 01 ← 02 ← 02b ← 05 ← 07 ← 08**
1. في Supabase: **New project** باسم مثل `uns-staging`. كلمة سر القاعدة تحتفظ بها لنفسك، **لا ترسلها لي ولا أي مفتاح `service_role`**.
2. في **SQL Editor** شغّل بالترتيب: `01_schema.sql` ثم `02_rls.sql` ثم `02b_storage.sql` (استعلام مستقل) ثم `05_hardening.sql` ثم `07_personalization.sql` ثم `08_body_marks.sql`. (تصحيح: نسخة سابقة من هذه الوثيقة قالت «لا 02b» وهذا خطأ لمشروع جديد.)
3. **Authentication:** فعّل **Anonymous sign-ins**، وفعّل **MFA (TOTP)**، وأوقف «Confirm email» في staging فقط (أو أكّد الحسابات بـSQL).
4. (موصى به) مفتاح **Turnstile** وتفعيل CAPTCHA.
5. أنشئ 3 حسابات اختبار: مسؤول، ممرض (بـ`04_make_nurse_and_admin.sql`)، ولي أمر.
6. أرسل لي **فقط**: رابط مشروع staging والمفتاح العام (publishable)، وتأكيدًا بأن الخطوات 2–3 تمت.

## 6) ملحق: مسوّدة SQL (غير مُشغَّلة وغير مفحوصة)
```sql
-- 10_child_devices (SKETCH; 09 is taken by the planner draft). Additive / create or replace only. Do not run before review on staging.
create table child_devices (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  user_id uuid not null unique references profiles(id) on delete cascade,   -- the anonymous auth user of that device
  label text check (char_length(label) <= 30),
  created_by uuid not null references profiles(id),                         -- the caregiver who paired it
  created_at timestamptz not null default now(),
  revoked_at timestamptz);
alter table child_devices enable row level security;   -- no direct access; only the functions below

create table child_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  created_by uuid not null references profiles(id),
  code_hash text not null unique,
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_by uuid references profiles(id), used_at timestamptz,
  created_at timestamptz not null default now());
alter table child_pairing_codes enable row level security;

-- Existing policies call is_child_self(); widen it so any active device of the child counts.
create or replace function is_child_self(c uuid) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(my_role() = 'child', false) and (
    exists(select 1 from child_profiles where id = c and user_id = auth.uid())
    or exists(select 1 from child_devices where child_id = c and user_id = auth.uid() and revoked_at is null)) $$;

create function caregiver_create_pairing_code(c uuid) returns text language plpgsql security definer set search_path=public as $$
declare raw text := gen_code(10);
begin
  if not is_caregiver_of(c) then raise exception 'not authorized'; end if;
  if (select count(*) from child_devices where child_id = c and revoked_at is null) >= 5 then raise exception 'device limit reached'; end if;
  insert into child_pairing_codes(child_id, created_by, code_hash) values (c, auth.uid(), hash_code(raw));
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table) values (auth.uid(), 'caregiver', 'CREATE_PAIRING_CODE', c, 'child_pairing_codes');
  return substr(raw,1,5) || '-' || substr(raw,6,5);
end $$;

create function child_redeem_pairing_code(p text, device_label text) returns uuid language plpgsql security definer set search_path=public, auth as $$
declare pc child_pairing_codes;
begin
  if not coalesce((select is_anonymous from auth.users where id = auth.uid()), false) then raise exception 'child devices only'; end if;
  if (select count(*) from code_attempts where user_id = auth.uid() and at > now() - interval '15 minutes') >= 5 then
    raise exception 'too many attempts, try again later'; end if;
  select * into pc from child_pairing_codes where code_hash = hash_code(p) and used_at is null and expires_at > now() for update;
  if not found then insert into code_attempts(user_id) values (auth.uid()); return null; end if;
  if (select count(*) from child_devices where child_id = pc.child_id and revoked_at is null) >= 5 then raise exception 'device limit reached'; end if;
  update child_pairing_codes set used_by = auth.uid(), used_at = now() where id = pc.id;
  update profiles set role = 'child' where id = auth.uid();
  insert into child_devices(child_id, user_id, label, created_by) values (pc.child_id, auth.uid(), left(device_label, 30), pc.created_by);
  insert into audit_logs(actor_id, actor_role, action, child_id, target_table) values (auth.uid(), 'child', 'PAIR_CHILD_DEVICE', pc.child_id, 'child_devices');
  return pc.child_id;
end $$;
-- Still to design: list/revoke device functions for caregiver and assigned nurse (revoke = set revoked_at AND profiles.is_active=false
-- for that device user), handle_new_user() so anonymous users are not created as 'caregiver', cleanup of unpaired anonymous users,
-- grants/revokes consistent with 02_rls.sql, extending validate_child_settings for synced settings, and tests in tests/db.
-- Check before running: the t_nurse_code trigger fires on role updates (harmless for 'child'); audit_logs accepts actor_role 'child';
-- anonymous users get role 'authenticated' in Supabase and, via handle_new_user(), a 'caregiver' profile by default: tighten this first.
```

## 6-ب) ملاحظة عن «مخططي» (مسوّدة 09)
`backend/09_planner.DRAFT.sql` (من جلسة أخرى، غير مشغَّلة) يعتمد على `is_child_self` و`is_caregiver_of` و`has_consent`، وسيستفيد من توسيع `is_child_self` لعدة أجهزة دون تغيير. لذلك ملف الأجهزة هنا يحمل الرقم **10** وليس 09، ويُنفَّذ بعد قرار المخطط. ملاحظة المخطط نفسها: لا يوجد دخول للطفل اليوم فـ`is_child_self()` لا تكون صحيحة أبدًا قبل هذه المرحلة.

## 7) أسئلة مفتوحة للمستخدم (لاحقًا)
- هل ننقل المهام والملصقات والتقدّم لتتزامن بين الأجهزة؟ (المقترح: نعم) وهل «ناسي» تبقى على كل جهاز على حدة؟ (المقترح: نعم، للخصوصية)
- هل 5 أجهزة للطفل سقف مناسب؟
- هل تُحفظ الأمنيات المكتوبة بنص الطفل الحر على الخادم؟ (يراها الممرض والأهل بحسب `w_sel`؛ وقد تحتوي معلومات شخصية: تنبيه الطفل موجود في الواجهة.)
- مدة صلاحية جلسة الطفل على أجهزة المستشفى المشتركة.
