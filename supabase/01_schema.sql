-- =====================================================================
--  АМЖИЛТ КИБЕР ЯАРМАГ СУРГУУЛЬ — Дугуйлангийн бүртгэл
--  01_schema.sql : хүснэгт, индекс, view, trigger
--  Supabase -> SQL Editor дээр ЭНЭ ФАЙЛЫГ ХАМГИЙН ТҮРҮҮНД ажиллуулна.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Нэрийг жишиж харьцуулах туслах функц.
--   "  Бат   Болд " -> "бат болд"
--   Ингэснээр давхар бүртгэлийг найдвартай илрүүлнэ.
-- ---------------------------------------------------------------------
create or replace function public.norm_name(p_text text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(btrim(coalesce(p_text, '')), '\s+', ' ', 'g'))
$$;

-- ---------------------------------------------------------------------
-- Ерөнхий тохиргоо (ганцхан мөртэй хүснэгт)
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  id                    smallint primary key default 1 check (id = 1),
  registration_open     boolean  not null default true,
  max_clubs_per_student smallint not null default 2
                          check (max_clubs_per_student between 1 and 10),
  announcement          text,
  updated_at            timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Ангийн бүлгүүд (1-1, 1-2, ... 12-3)
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

create table if not exists public.class_groups (
  code       text primary key,
  grade      smallint not null check (grade between 1 and 12),
  sort_order integer  not null default 0
);

create index if not exists class_groups_grade_idx on public.class_groups (grade);

-- ---------------------------------------------------------------------
-- Дугуйлан
--   capacity = NULL  ->  хязгааргүй
--   grades           ->  хамрах ангиуд, жишээ {3,4,5}
-- ---------------------------------------------------------------------
create table if not exists public.clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  level      text not null check (level in ('baga', 'dund', 'ahlah')),
  grades     smallint[] not null check (array_length(grades, 1) >= 1),
  room       text,
  teacher    text,
  capacity   integer check (capacity is null or capacity > 0),
  is_open    boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists clubs_grades_idx on public.clubs using gin (grades);
create index if not exists clubs_level_idx  on public.clubs (level);
create index if not exists clubs_order_idx  on public.clubs (sort_order);

-- ---------------------------------------------------------------------
-- Дугуйлангийн цаг.
--   Нэг дугуйланд ОЛОН мөр байж болно
--   (жишээ нь "Шатар 3-р анги" нь Даваа + Баасан гэсэн 2 мөртэй).
--   weekday: 1=Даваа, 2=Мягмар, 3=Лхагва, 4=Пүрэв, 5=Баасан, 6=Бямба, 7=Ням
--   weekday = NULL  ->  "цаг тодорхойгүй"
-- ---------------------------------------------------------------------
create table if not exists public.club_sessions (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  weekday    smallint check (weekday between 1 and 7),
  start_time time,
  end_time   time,
  note       text,
  constraint club_sessions_time_order
    check (start_time is null or end_time is null or end_time > start_time)
);

create index if not exists club_sessions_club_idx on public.club_sessions (club_id);

-- ---------------------------------------------------------------------
-- Бүртгэл
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs(id) on delete cascade,
  student_name text not null check (length(btrim(student_name)) >= 2),
  student_key  text generated always as (public.norm_name(student_name)) stored,
  grade        smallint not null check (grade between 1 and 12),
  class_group  text not null references public.class_groups(code),
  parent_phone text not null check (parent_phone ~ '^[0-9]{8}$'),
  status       text not null default 'registered'
                 check (status in ('registered', 'waitlisted', 'cancelled')),
  note         text,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);

-- ⚠️ Нэг сурагч нэг дугуйланд ХОЁР УДАА бүртгүүлэхийг ӨС-ийн түвшинд хориглоно.
create unique index if not exists registrations_unique_active
  on public.registrations (club_id, student_key, grade, class_group)
  where status <> 'cancelled';

create index if not exists registrations_club_status_idx
  on public.registrations (club_id, status, created_at, id);

create index if not exists registrations_student_idx
  on public.registrations (student_key, grade, class_group)
  where status <> 'cancelled';

-- ---------------------------------------------------------------------
-- Суудлын тоо — БОДИТ ЦАГТ (Realtime) энэ хүснэгтээр дамжина.
--   registrations хүснэгт нь хувийн мэдээлэлтэй тул нийтэд харагдахгүй.
--   Харин энэ хүснэгт зөвхөн ТОО агуулах тул аюулгүй.
-- ---------------------------------------------------------------------
create table if not exists public.club_seat_counts (
  club_id          uuid primary key references public.clubs(id) on delete cascade,
  registered_count integer not null default 0,
  waitlist_count   integer not null default 0,
  updated_at       timestamptz not null default now()
);

-- Тоог дахин тооцоолох
create or replace function public.refresh_seat_counts(p_club_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Дугуйлан устсан (эсвэл устаж байгаа) бол тоолуурыг хөндөхгүй.
  -- Үгүй бол cascade устгалын үед гадаад түлхүүрийн зөрчил гарна.
  if not exists (select 1 from public.clubs c where c.id = p_club_id) then
    return;
  end if;

  insert into public.club_seat_counts (club_id, registered_count, waitlist_count, updated_at)
  select p_club_id,
         count(*) filter (where r.status = 'registered'),
         count(*) filter (where r.status = 'waitlisted'),
         now()
  from public.registrations r
  where r.club_id = p_club_id
  on conflict (club_id) do update
    set registered_count = excluded.registered_count,
        waitlist_count   = excluded.waitlist_count,
        updated_at       = excluded.updated_at;
end
$$;

create or replace function public.tg_registrations_seat_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_seat_counts(old.club_id);
    return old;
  end if;

  perform public.refresh_seat_counts(new.club_id);

  if tg_op = 'UPDATE' and new.club_id is distinct from old.club_id then
    perform public.refresh_seat_counts(old.club_id);
  end if;

  return new;
end
$$;

drop trigger if exists registrations_seat_counts_trg on public.registrations;
create trigger registrations_seat_counts_trg
  after insert or update or delete on public.registrations
  for each row execute function public.tg_registrations_seat_counts();

-- Шинэ дугуйлан үүсэхэд тоолуурын мөрийг нь бэлдэнэ
create or replace function public.tg_clubs_seat_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.club_seat_counts (club_id) values (new.id)
  on conflict (club_id) do nothing;
  return new;
end
$$;

drop trigger if exists clubs_seat_row_trg on public.clubs;
create trigger clubs_seat_row_trg
  after insert on public.clubs
  for each row execute function public.tg_clubs_seat_row();

-- ---------------------------------------------------------------------
-- Дараалал тооцсон харагдац (админд зориулсан).
--   Дугаарыг хадгалдаггүй тул хэзээ ч хуучирахгүй.
-- ---------------------------------------------------------------------
create or replace view public.registrations_with_position
with (security_invoker = true) as
select r.*,
       row_number() over (
         partition by r.club_id, r.status
         order by r.created_at, r.id
       ) as queue_position
from public.registrations r
where r.status in ('registered', 'waitlisted');
