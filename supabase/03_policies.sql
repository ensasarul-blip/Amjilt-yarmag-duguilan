-- =====================================================================
--  03_policies.sql : Аюулгүй байдал (RLS) + Realtime
--
--  ЗАРЧИМ
--  ------
--  * Дугуйлан, цаг, суудлын ТОО  -> хүн бүр УНШИНА (нэвтрэх шаардлагагүй)
--  * registrations хүснэгт        -> нийтэд ОГТ ХАРАГДАХГҮЙ
--                                    (сурагчийн нэр, утас хувийн мэдээлэл)
--  * Нийтийн бүх үйлдэл дээрх SECURITY DEFINER функцүүдээр л явна
--  * Админ = Supabase Auth-аар нэвтэрсэн хэрэглэгч -> бүх эрхтэй
-- =====================================================================

alter table public.clubs            enable row level security;
alter table public.club_sessions    enable row level security;
alter table public.club_seat_counts enable row level security;
alter table public.app_settings     enable row level security;
alter table public.class_groups     enable row level security;
alter table public.registrations    enable row level security;

-- ---------------------------------------------------------------------
-- Нийтэд НЭЭЛТТЭЙ УНШИХ эрх
-- ---------------------------------------------------------------------
drop policy if exists clubs_public_read on public.clubs;
create policy clubs_public_read on public.clubs
  for select to anon, authenticated using (true);

drop policy if exists sessions_public_read on public.club_sessions;
create policy sessions_public_read on public.club_sessions
  for select to anon, authenticated using (true);

drop policy if exists counts_public_read on public.club_seat_counts;
create policy counts_public_read on public.club_seat_counts
  for select to anon, authenticated using (true);

drop policy if exists settings_public_read on public.app_settings;
create policy settings_public_read on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists groups_public_read on public.class_groups;
create policy groups_public_read on public.class_groups
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Админ (нэвтэрсэн хэрэглэгч) — бүрэн эрх
-- ---------------------------------------------------------------------
drop policy if exists clubs_admin_all on public.clubs;
create policy clubs_admin_all on public.clubs
  for all to authenticated using (true) with check (true);

drop policy if exists sessions_admin_all on public.club_sessions;
create policy sessions_admin_all on public.club_sessions
  for all to authenticated using (true) with check (true);

drop policy if exists counts_admin_all on public.club_seat_counts;
create policy counts_admin_all on public.club_seat_counts
  for all to authenticated using (true) with check (true);

drop policy if exists settings_admin_all on public.app_settings;
create policy settings_admin_all on public.app_settings
  for all to authenticated using (true) with check (true);

drop policy if exists groups_admin_all on public.class_groups;
create policy groups_admin_all on public.class_groups
  for all to authenticated using (true) with check (true);

drop policy if exists registrations_admin_all on public.registrations;
create policy registrations_admin_all on public.registrations
  for all to authenticated using (true) with check (true);

-- ⚠️ registrations дээр anon-д ЯМАР Ч policy алга.
--    Тиймээс нэвтрээгүй хүн сурагчдын нэр, утсыг ОГТ харж чадахгүй.

-- ---------------------------------------------------------------------
-- Функцүүдийн гүйцэтгэх эрх
-- ---------------------------------------------------------------------
revoke all on function public.register_student(text, smallint, text, text, uuid[])  from public;
revoke all on function public.find_my_registrations(smallint, text, text)           from public;
revoke all on function public.cancel_my_registration(uuid, smallint, text, text)    from public;
revoke all on function public.cancel_registration(uuid)                             from public;
revoke all on function public.promote_registration(uuid)                            from public;

-- Эцэг эх (нэвтрээгүй) ашиглана
grant execute on function public.register_student(text, smallint, text, text, uuid[]) to anon, authenticated;
grant execute on function public.find_my_registrations(smallint, text, text)          to anon, authenticated;
grant execute on function public.cancel_my_registration(uuid, smallint, text, text)   to anon, authenticated;

-- ЗӨВХӨН админ ашиглана
grant execute on function public.cancel_registration(uuid)  to authenticated;
grant execute on function public.promote_registration(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- БОДИТ ЦАГИЙН ШИНЭЧЛЭЛТ (Supabase Realtime)
--   Зөвхөн суудлын ТООГ нийтэлнэ. Хувийн мэдээлэл дамжихгүй.
--
--   ⚠️ АНХААР: Supabase дээр supabase_realtime нийтлэлийг supabase_admin
--   эзэмшдэг тул SQL Editor (postgres) үүнийг ӨӨРЧИЛЖ ЧАДАХГҮЙ.
--   Доорх блок чимээгүй алгасагдана — энэ нь ХЭВИЙН.
--
--   ЗААВАЛ ГАРААР ХИЙНЭ:
--     Database -> Replication -> supabase_realtime -> club_seat_counts АСААНА
--   (README.md-ийн Алхам 5)
-- ---------------------------------------------------------------------
alter table public.club_seat_counts replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'club_seat_counts'
    ) then
      execute 'alter publication supabase_realtime add table public.club_seat_counts';
    end if;
  end if;
exception
  when others then
    raise notice 'Realtime publication алгасав: %', sqlerrm;
end
$$;
