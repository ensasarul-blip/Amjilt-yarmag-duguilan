-- =====================================================================
--  02_functions.sql : Суудлын хязгаарыг АТОМАРААР хянах функцүүд
--
--  ГОЛ САНАА
--  ---------
--  Бүртгэл бүр `SELECT ... FROM clubs WHERE id = ? FOR UPDATE` гэсэн
--  МӨРИЙН ТҮГЖЭЭ авснаар эхэлнэ. Ингэснээр нэг дугуйлан дээр зэрэг ирсэн
--  хүсэлтүүд ДАРААЛАЛД ОРНО. Суудлыг тоолох ба бүртгэх үйлдэл түгжээний
--  дотор явагдах тул хязгаараас ХЭЗЭЭ Ч хэтрэхгүй.
--
--  Функц бүр нэг гүйлгээ (transaction) — бүгд амжилттай, эсвэл бүгд буцна.
-- =====================================================================

-- ---------------------------------------------------------------------
--  register_student : эцэг эхийн үндсэн бүртгэл
--
--  Буцаах утга (jsonb массив), дугуйлан бүрд нэг элемент:
--    { club_id, club_name, status, position, registration_id }
--
--  status:
--    registered     -> бүртгэгдлээ
--    waitlisted     -> дүүрсэн тул хүлээлгийн жагсаалтад (position = хэд дэх)
--    duplicate      -> энэ сурагч уг дугуйланд аль хэдийн бүртгэлтэй
--    limit_reached  -> нэг сурагчийн дугуйлангийн дээд хязгаарт хүрсэн
--    closed         -> уг дугуйлангийн бүртгэл хаалттай
--    grade_mismatch -> тухайн анги энэ дугуйланд хамаарахгүй
--    not_found      -> дугуйлан олдсонгүй
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


-- ---------------------------------------------------------------------
--  cancel_registration : бүртгэл цуцлах.
--  Хязгаартай дугуйлан бол хүлээлгийн ЭХНИЙ хүнийг автоматаар дэвшүүлнэ.
-- ---------------------------------------------------------------------
create or replace function public.cancel_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg        public.registrations%rowtype;
  v_club       public.clubs%rowtype;
  v_promoted_id   uuid;
  v_promoted_name text;
  v_taken      integer;
begin
  select * into v_reg from public.registrations where id = p_registration_id;
  if not found then
    raise exception 'БҮРТГЭЛ_ОЛДСОНГҮЙ';
  end if;

  if v_reg.status = 'cancelled' then
    return jsonb_build_object('cancelled', false, 'reason', 'already_cancelled');
  end if;

  -- >>> ТҮГЖЭЭ: дэвшүүлэлт зэрэг явахаас сэргийлнэ <<<
  select * into v_club from public.clubs where id = v_reg.club_id for update;

  update public.registrations
     set status = 'cancelled', cancelled_at = now()
   where id = p_registration_id;

  -- Хүлээлгийн эхний хүнийг автоматаар бүртгэнэ
  if v_club.capacity is not null then
    select count(*) into v_taken
    from public.registrations r
    where r.club_id = v_club.id and r.status = 'registered';

    if v_taken < v_club.capacity then
      select r.id, r.student_name into v_promoted_id, v_promoted_name
      from public.registrations r
      where r.club_id = v_club.id and r.status = 'waitlisted'
      order by r.created_at, r.id
      limit 1;

      if v_promoted_id is not null then
        update public.registrations
           set status = 'registered'
         where id = v_promoted_id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'cancelled', true,
    'club_id', v_club.id,
    'promoted_registration_id', v_promoted_id,
    'promoted_student_name', v_promoted_name
  );
end
$$;


-- ---------------------------------------------------------------------
--  promote_registration : админ ГАРААР хүлээлгээс бүртгэлд оруулах.
--  Хязгаараас хэтэрч байвал over_capacity = true гэж мэдэгдэнэ
--  (админы шийдвэр тул хориглохгүй).
-- ---------------------------------------------------------------------
create or replace function public.promote_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg   public.registrations%rowtype;
  v_club  public.clubs%rowtype;
  v_taken integer;
  v_over  boolean := false;
begin
  select * into v_reg from public.registrations where id = p_registration_id;
  if not found then
    raise exception 'БҮРТГЭЛ_ОЛДСОНГҮЙ';
  end if;

  select * into v_club from public.clubs where id = v_reg.club_id for update;

  select count(*) into v_taken
  from public.registrations r
  where r.club_id = v_club.id and r.status = 'registered';

  if v_club.capacity is not null and v_taken >= v_club.capacity then
    v_over := true;
  end if;

  update public.registrations
     set status = 'registered', cancelled_at = null
   where id = p_registration_id;

  return jsonb_build_object('promoted', true, 'over_capacity', v_over);
end
$$;


-- ---------------------------------------------------------------------
--  find_my_registrations : эцэг эх өөрийн бүртгэлээ хайх.
--  Нэвтрэх шаардлагагүй. Зөвхөн ТУХАЙН сурагчийн мөрийг буцаана.
--  Утасны дугаарыг бүтнээр нь буцаахгүй (сүүлийн 4 орон л харагдана).
-- ---------------------------------------------------------------------
create or replace function public.find_my_registrations(
  p_grade       smallint,
  p_class_group text,
  p_student_name text
)
returns table (
  registration_id uuid,
  club_id         uuid,
  club_name       text,
  room            text,
  teacher         text,
  status          text,
  queue_position  bigint,
  phone_masked    text,
  created_at      timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select r.id,
         c.id,
         c.name,
         c.room,
         c.teacher,
         r.status,
         (select count(*)
            from public.registrations r2
           where r2.club_id = r.club_id
             and r2.status  = r.status
             and (r2.created_at, r2.id) <= (r.created_at, r.id)),
         '****' || right(r.parent_phone, 4),
         r.created_at
  from public.registrations r
  join public.clubs c on c.id = r.club_id
  where r.grade       = p_grade
    and r.class_group = p_class_group
    and r.student_key = public.norm_name(p_student_name)
    and r.status     <> 'cancelled'
  order by r.created_at;
$$;


-- ---------------------------------------------------------------------
--  cancel_my_registration : эцэг эх өөрийн бүртгэлээ устгах.
--  Анги + бүлэг + нэр гурав таарч байж л цуцална.
-- ---------------------------------------------------------------------
create or replace function public.cancel_my_registration(
  p_registration_id uuid,
  p_grade           smallint,
  p_class_group     text,
  p_student_name    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select exists (
    select 1 from public.registrations r
    where r.id          = p_registration_id
      and r.grade       = p_grade
      and r.class_group = p_class_group
      and r.student_key = public.norm_name(p_student_name)
      and r.status     <> 'cancelled'
  ) into v_ok;

  if not v_ok then
    raise exception 'БҮРТГЭЛ_ТААРАХГҮЙ';
  end if;

  return public.cancel_registration(p_registration_id);
end
$$;
