-- =====================================================================
--  05. ШАТЛАСАН БҮРТГЭЛ (түвшин тус бүр өөр өдөр)
--
--  ⚠️ ЭНЭ ФАЙЛЫГ ЗӨВХӨН НЭГ УДАА АЖИЛЛУУЛНА.
--     Supabase -> SQL Editor -> New query -> доорхийг бүтнээр нь хуулж
--     тавиад -> Run.
--
--  Хийх зүйл:
--    1. level_schedule хүснэгт үүсгэнэ (түвшин бүрийн нээх/хаах хугацаа)
--    2. Бага 09-21, Дунд 09-22, Ахлах 09-23 гэж бөглөнө
--    3. Бүртгэлийн функц тухайн түвшний өдөр мөн эсэхийг ШАЛГАДАГ болно
--
--  Дахин ажиллуулсан ч аюулгүй (бүх зүйл "if not exists" / "or replace").
--  Аль хэдийн байгаа огноог ДАРЖ БИЧИХГҮЙ.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Хүснэгт
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- Түвшин тус бүрийн бүртгэлийн хуваарь (шатласан бүртгэл)
--   Бага / дунд / ахлах анги өөр өөр өдөр бүртгүүлнэ.
--   opens_at ба closes_at NULL бол тухайн түвшинд хязгаар байхгүй.
--   Хугацааг ЗӨВХӨН энэ хүснэгтээр удирдана — админ самбараас өөрчилнө.
-- ---------------------------------------------------------------------
create table if not exists public.level_schedule (
  level      text primary key check (level in ('baga','dund','ahlah')),
  opens_at   timestamptz,
  closes_at  timestamptz,
  sort_order smallint not null default 0,
  constraint level_schedule_time_order
    check (opens_at is null or closes_at is null or closes_at > opens_at)
);

-- ---------------------------------------------------------------------
-- 2. Эрхийн тохиргоо (RLS)
-- ---------------------------------------------------------------------
alter table public.level_schedule enable row level security;

drop policy if exists schedule_public_read on public.level_schedule;
create policy schedule_public_read on public.level_schedule
  for select to anon, authenticated using (true);

drop policy if exists schedule_admin_all on public.level_schedule;
create policy schedule_admin_all on public.level_schedule
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 3. Туслах функцүүд
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- Анги -> түвшин (бага 1-5, дунд 6-9, ахлах 10-12)
-- ---------------------------------------------------------------------
create or replace function public.level_of_grade(p_grade smallint)
returns text language sql immutable as $$
  select case
           when p_grade is null then null
           when p_grade <= 5  then 'baga'
           when p_grade <= 9  then 'dund'
           else 'ahlah'
         end
$$;

-- ---------------------------------------------------------------------
-- ШАТЛАСАН БҮРТГЭЛ: тухайн ангийн түвшин ЯГ ОДОО нээлттэй эсэхийг шалгана.
--
-- Энэ шалгалт өгөгдлийн санд байгаа нь ЧУХАЛ: зөвхөн дэлгэц дээр
-- хориглосон бол хэн нэгэн шууд хүсэлт илгээж тойрч гарах боломжтой.
-- ---------------------------------------------------------------------
create or replace function public.assert_level_open(p_grade smallint)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  v_level text := public.level_of_grade(p_grade);
  v_row   public.level_schedule%rowtype;
begin
  select * into v_row from public.level_schedule where level = v_level;

  -- Хуваарь тохируулаагүй бол хязгаарлахгүй
  if not found then
    return;
  end if;

  if v_row.opens_at is not null and now() < v_row.opens_at then
    raise exception 'ТҮВШИН_ЭХЛЭЭГҮЙ';
  end if;

  if v_row.closes_at is not null and now() >= v_row.closes_at then
    raise exception 'ТҮВШИН_ДУУССАН';
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- 4. Бүртгэлийн функцийг шинэчилнэ (түвшний шалгалт нэмэгдсэн)
-- ---------------------------------------------------------------------
create or replace function public.register_student(
  p_student_name text,
  p_grade        smallint,
  p_class_group  text,
  p_parent_phone text,
  p_club_ids     uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings   public.app_settings%rowtype;
  v_club       public.clubs%rowtype;
  v_name       text := btrim(coalesce(p_student_name, ''));
  v_phone      text := regexp_replace(coalesce(p_parent_phone, ''), '\D', '', 'g');
  v_key        text;
  v_club_ids   uuid[];
  v_club_id    uuid;
  v_taken      integer;
  v_waiting    integer;
  v_active     integer;
  v_position   integer;
  v_status     text;
  v_new_id     uuid;
  v_dup        boolean;
  v_results    jsonb := '[]'::jsonb;
begin
  ---------------------------------------------------------------------
  -- 1. Ерөнхий шалгалт
  ---------------------------------------------------------------------
  select * into v_settings from public.app_settings where id = 1;
  if not found then
    raise exception 'ТОХИРГОО_ОЛДСОНГҮЙ';
  end if;

  if not v_settings.registration_open then
    raise exception 'БҮРТГЭЛ_ХААЛТТАЙ';
  end if;

  if length(v_name) < 2 then
    raise exception 'НЭР_БУРУУ';
  end if;

  if v_phone !~ '^[0-9]{8}$' then
    raise exception 'УТАС_БУРУУ';
  end if;

  if p_grade is null or p_grade < 1 or p_grade > 12 then
    raise exception 'АНГИ_БУРУУ';
  end if;

  if not exists (
    select 1 from public.class_groups g
    where g.code = p_class_group and g.grade = p_grade
  ) then
    raise exception 'БҮЛЭГ_БУРУУ';
  end if;

  -- Шатласан бүртгэл: энэ түвшний өдөр мөн үү?
  perform public.assert_level_open(p_grade);

  if p_club_ids is null or array_length(p_club_ids, 1) is null then
    raise exception 'ДУГУЙЛАН_СОНГООГҮЙ';
  end if;

  v_key := public.norm_name(v_name);

  ---------------------------------------------------------------------
  -- 2. Давхардлыг арилгаж ЭРЭМБЭЛНЭ.
  --    Бүх гүйлгээ ижил дарааллаар түгжээ авбал deadlock үүсэхгүй.
  ---------------------------------------------------------------------
  select array_agg(x order by x) into v_club_ids
  from (select distinct unnest(p_club_ids) as x) s;

  ---------------------------------------------------------------------
  -- 3. Дугуйлан бүрийг МӨРИЙН ТҮГЖЭЭТЭЙГЭЭР боловсруулна
  ---------------------------------------------------------------------
  foreach v_club_id in array v_club_ids loop

    -- >>> ЭНД ТҮГЖЭЭ ТАВИГДАНА <<<
    -- Өөр гүйлгээ ижил дугуйлан дээр ажиллаж байвал энд ХҮЛЭЭНЭ.
    select * into v_club from public.clubs where id = v_club_id for update;

    if not found then
      v_results := v_results || jsonb_build_object(
        'club_id', v_club_id, 'club_name', null,
        'status', 'not_found', 'position', null, 'registration_id', null);
      continue;
    end if;

    if not v_club.is_open then
      v_results := v_results || jsonb_build_object(
        'club_id', v_club_id, 'club_name', v_club.name,
        'status', 'closed', 'position', null, 'registration_id', null);
      continue;
    end if;

    if not (p_grade = any (v_club.grades)) then
      v_results := v_results || jsonb_build_object(
        'club_id', v_club_id, 'club_name', v_club.name,
        'status', 'grade_mismatch', 'position', null, 'registration_id', null);
      continue;
    end if;

    -- Давхар бүртгэл?
    if exists (
      select 1 from public.registrations r
      where r.club_id     = v_club_id
        and r.student_key = v_key
        and r.grade       = p_grade
        and r.class_group = p_class_group
        and r.status     <> 'cancelled'
    ) then
      v_results := v_results || jsonb_build_object(
        'club_id', v_club_id, 'club_name', v_club.name,
        'status', 'duplicate', 'position', null, 'registration_id', null);
      continue;
    end if;

    -- Нэг сурагчид ногдох дугуйлангийн дээд хязгаар (анхдагч = 2)
    select count(*) into v_active
    from public.registrations r
    where r.student_key = v_key
      and r.grade       = p_grade
      and r.class_group = p_class_group
      and r.status     <> 'cancelled';

    if v_active >= v_settings.max_clubs_per_student then
      v_results := v_results || jsonb_build_object(
        'club_id', v_club_id, 'club_name', v_club.name,
        'status', 'limit_reached', 'position', null, 'registration_id', null);
      continue;
    end if;

    -- Түгжээний доор бодит суудлыг тоолно
    select count(*) into v_taken
    from public.registrations r
    where r.club_id = v_club_id and r.status = 'registered';

    if v_club.capacity is null or v_taken < v_club.capacity then
      v_status   := 'registered';
      v_position := v_taken + 1;
    else
      select count(*) into v_waiting
      from public.registrations r
      where r.club_id = v_club_id and r.status = 'waitlisted';

      v_status   := 'waitlisted';
      v_position := v_waiting + 1;
    end if;

    -- Хамгаалалтын давхарга: түгжээ ажиллаагүй ямар нэг тохиолдолд ч
    -- ӨС-ийн unique индекс давхар бүртгэлийг барина.
    v_dup := false;
    begin
      insert into public.registrations
        (club_id, student_name, grade, class_group, parent_phone, status)
      values
        (v_club_id, v_name, p_grade, p_class_group, v_phone, v_status)
      returning id into v_new_id;
    exception
      when unique_violation then
        v_dup := true;
    end;

    if v_dup then
      v_results := v_results || jsonb_build_object(
        'club_id', v_club_id, 'club_name', v_club.name,
        'status', 'duplicate', 'position', null, 'registration_id', null);
      continue;
    end if;

    v_results := v_results || jsonb_build_object(
      'club_id', v_club_id, 'club_name', v_club.name,
      'status', v_status, 'position', v_position, 'registration_id', v_new_id);

  end loop;

  return v_results;
end
$$;
$$;

-- ---------------------------------------------------------------------
-- 5. Хуваарийг бөглөнө
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- ШАТЛАСАН БҮРТГЭЛИЙН ХУВААРЬ
--   Цагийг Улаанбаатарын цагаар (+08) бичнэ.
--   Түвшин бүр ЗӨВХӨН өөрийн өдөр нээлттэй.
--     Бага  — 2026-09-21 Даваа
--     Дунд  — 2026-09-22 Мягмар
--     Ахлах — 2026-09-23 Лхагва
--   Огноог админ самбараас өөрчилж болно.
-- ---------------------------------------------------------------------
insert into public.level_schedule (level, opens_at, closes_at, sort_order) values
  ('baga',  '2026-09-21 00:00:00+08', '2026-09-22 00:00:00+08', 1),
  ('dund',  '2026-09-22 00:00:00+08', '2026-09-23 00:00:00+08', 2),
  ('ahlah', '2026-09-23 00:00:00+08', '2026-09-24 00:00:00+08', 3)
on conflict (level) do nothing;

-- ---------------------------------------------------------------------
-- 6. ШАЛГАХ — доорх мөр 3 эгнээ буцаах ёстой
-- ---------------------------------------------------------------------
select level,
       opens_at  at time zone 'Asia/Ulaanbaatar' as "нээгдэх",
       closes_at at time zone 'Asia/Ulaanbaatar' as "хаагдах"
from public.level_schedule
order by sort_order;
