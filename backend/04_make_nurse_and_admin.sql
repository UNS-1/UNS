-- Run in the Supabase SQL Editor AFTER each person has signed up on app.html.
-- 1) Replace the two emails. 2) Run. 3) The last query shows each nurse's private code: give it to that nurse privately.
update profiles set role = 'admin' where id = (select id from auth.users where email = 'ADMIN_EMAIL_HERE');
update profiles set role = 'nurse', display_name = 'NURSE_NAME_HERE' where id = (select id from auth.users where email = 'NURSE_EMAIL_HERE');
select u.email, p.role, p.nurse_code from profiles p join auth.users u on u.id = p.id order by p.role, u.email;
