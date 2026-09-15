import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import {
  createTestClub,
  dropTestClub,
  setupTestDb,
  type TestDb,
} from "./helpers/testDb";

let db: TestDb;

beforeAll(async () => {
  db = await setupTestDb();
  // eslint-disable-next-line no-console
  console.log(
    `\n  Өгөгдлийн сан: ${db.mode === "local" ? "локал түр PostgreSQL" : "DATABASE_URL (Supabase)"}\n`,
  );
}, 240_000);

afterAll(async () => {
  await db?.close();
});

type RegResult = {
  club_id: string;
  club_name: string | null;
  status: string;
  position: number | null;
  registration_id: string | null;
};

/**
 * N ширхэг ТУСДАА холболтоос ЗЭРЭГ бүртгүүлэх хүсэлт илгээнэ.
 * Энэ нь жинхэнэ зэрэгцээ ачаалал — нэг pool дээрх дараалал биш.
 */
async function fireConcurrent(opts: {
  clubIds: string[];
  count: number;
  grade: number;
  group: string;
  namePrefix: string;
}): Promise<RegResult[][]> {
  const clients = Array.from(
    { length: opts.count },
    () => new pg.Client({ connectionString: db.connectionString }),
  );

  await Promise.all(clients.map((c) => c.connect()));

  try {
    // Бүх холболт бэлэн болсны дараа НЭГ ЗЭРЭГ явуулна
    const results = await Promise.all(
      clients.map(async (client, i) => {
        const { rows } = await client.query<{ result: RegResult[] }>(
          "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[]) as result",
          [
            `${opts.namePrefix} ${i + 1}`,
            opts.grade,
            opts.group,
            "99000000",
            opts.clubIds,
          ],
        );
        return rows[0].result;
      }),
    );
    return results;
  } finally {
    await Promise.all(clients.map((c) => c.end().catch(() => {})));
  }
}

async function countByStatus(clubId: string) {
  const { rows } = await db.pool.query<{ status: string; n: string }>(
    "select status, count(*)::text as n from public.registrations where club_id = $1 group by status",
    [clubId],
  );
  const out: Record<string, number> = {
    registered: 0,
    waitlisted: 0,
    cancelled: 0,
  };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

describe("Суудлын хязгаар — зэрэгцээ бүртгэл", () => {
  it("15 суудалтай дугуйланд 20 хүсэлт ЗЭРЭГ ирэхэд яг 15 бүртгэгдэж, 5 нь хүлээлэгт орно", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Усан сэлэлт (15)",
      capacity: 15,
      grades: [5],
    });

    try {
      const results = await fireConcurrent({
        clubIds: [clubId],
        count: 20,
        grade: 5,
        group: "5-1",
        namePrefix: "Тест Сурагч",
      });

      const flat = results.flat();
      expect(flat).toHaveLength(20);

      const registered = flat.filter((r) => r.status === "registered");
      const waitlisted = flat.filter((r) => r.status === "waitlisted");

      expect(registered).toHaveLength(15);
      expect(waitlisted).toHaveLength(5);

      // Өгөгдлийн санд ч мөн адил байх ёстой
      const counts = await countByStatus(clubId);
      expect(counts.registered).toBe(15);
      expect(counts.waitlisted).toBe(5);

      // Дараалал 1..15 ба 1..5 гэж давхардалгүй гарсан эсэх
      expect(registered.map((r) => r.position).sort((a, b) => a! - b!)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      ]);
      expect(waitlisted.map((r) => r.position).sort((a, b) => a! - b!)).toEqual([
        1, 2, 3, 4, 5,
      ]);

      // Бодит цагийн тоолуур зөв шинэчлэгдсэн эсэх
      const { rows } = await db.pool.query<{
        registered_count: number;
        waitlist_count: number;
      }>("select registered_count, waitlist_count from public.club_seat_counts where club_id = $1", [
        clubId,
      ]);
      expect(rows[0].registered_count).toBe(15);
      expect(rows[0].waitlist_count).toBe(5);
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });

  it("илүү хүнд ачаалал: 15 суудалтай дугуйланд 40 хүсэлт -> 15 + 25", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Төгөлдөр хуур (15)",
      capacity: 15,
      grades: [5],
    });

    try {
      const results = await fireConcurrent({
        clubIds: [clubId],
        count: 40,
        grade: 5,
        group: "5-2",
        namePrefix: "Ачаалал Сурагч",
      });

      const flat = results.flat();
      expect(flat.filter((r) => r.status === "registered")).toHaveLength(15);
      expect(flat.filter((r) => r.status === "waitlisted")).toHaveLength(25);

      const counts = await countByStatus(clubId);
      expect(counts.registered).toBe(15);
      expect(counts.waitlisted).toBe(25);
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });

  it("ӨНДӨР АЧААЛАЛ: 15 суудалтай дугуйланд 200 хүсэлт ЗЭРЭГ -> 15 + 185", async () => {
    // Сургууль "бүртгэл 20:00 цагт нээгдэнэ" гэж зарлавал олон эцэг эх
    // яг нэг агшинд товч дарна. Тэр үед ч тоо яг таарах ёстой.
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Ачаалал (15)",
      grades: [7],
      capacity: 15,
    });

    const t0 = Date.now();
    const results = await fireConcurrent({
      clubIds: [clubId],
      count: 200,
      grade: 7,
      group: "7-1",
      namePrefix: "Ачаалал Сурагч",
    });
    const elapsed = Date.now() - t0;

    const counts = await countByStatus(clubId);
    expect(counts.registered).toBe(15);
    expect(counts.waitlisted).toBe(185);

    // Дараалал 1-15 ба 1-185 хүртэл давхцалгүй байх ёстой
    const regPos = results.flat().filter((r) => r.status === "registered").map((r) => r.position);
    const waitPos = results.flat().filter((r) => r.status === "waitlisted").map((r) => r.position);
    expect(new Set(regPos).size).toBe(15);
    expect(new Set(waitPos).size).toBe(185);

    // Түгжээ зөв ажиллавал шугаман хугацаанд дуусна (deadlock/timeout байхгүй)
    expect(elapsed).toBeLessThan(30_000);

    await dropTestClub(db.pool, clubId);
  }, 60_000);

  it("хязгааргүй дугуйланд бүгд бүртгэгдэнэ", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Хязгааргүй",
      capacity: null,
      grades: [5],
    });

    try {
      const results = await fireConcurrent({
        clubIds: [clubId],
        count: 20,
        grade: 5,
        group: "5-1",
        namePrefix: "Чөлөөт Сурагч",
      });

      const flat = results.flat();
      expect(flat.filter((r) => r.status === "registered")).toHaveLength(20);
      expect(flat.filter((r) => r.status === "waitlisted")).toHaveLength(0);
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });
});

describe("Цуцлалт ба хүлээлгийн жагсаалт", () => {
  it("бүртгэл цуцлагдвал хүлээлгийн ЭХНИЙ хүн автоматаар бүртгэгдэнэ", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Цуцлалт (3)",
      capacity: 3,
      grades: [4],
    });

    try {
      // 5 хүн -> 3 бүртгэгдэж, 2 хүлээлэгт
      const results = await fireConcurrent({
        clubIds: [clubId],
        count: 5,
        grade: 4,
        group: "4-1",
        namePrefix: "Цуцлалт Сурагч",
      });
      const flat = results.flat();
      expect(flat.filter((r) => r.status === "registered")).toHaveLength(3);
      expect(flat.filter((r) => r.status === "waitlisted")).toHaveLength(2);

      // Хүлээлгийн эхний хүнийг тэмдэглэж авна
      const { rows: waiting } = await db.pool.query<{ id: string; student_name: string }>(
        `select id, student_name from public.registrations
          where club_id = $1 and status = 'waitlisted'
          order by created_at, id`,
        [clubId],
      );
      const firstInLine = waiting[0];

      // Бүртгэгдсэн нэг хүнийг цуцална
      const { rows: reg } = await db.pool.query<{ id: string }>(
        `select id from public.registrations
          where club_id = $1 and status = 'registered'
          order by created_at, id limit 1`,
        [clubId],
      );

      const { rows: cancelRows } = await db.pool.query<{ result: Record<string, unknown> }>(
        "select public.cancel_registration($1) as result",
        [reg[0].id],
      );

      expect(cancelRows[0].result.cancelled).toBe(true);
      expect(cancelRows[0].result.promoted_registration_id).toBe(firstInLine.id);
      expect(cancelRows[0].result.promoted_student_name).toBe(firstInLine.student_name);

      // Суудал дахин дүүрсэн байх ёстой
      const counts = await countByStatus(clubId);
      expect(counts.registered).toBe(3);
      expect(counts.waitlisted).toBe(1);
      expect(counts.cancelled).toBe(1);
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });

  it("хязгааргүй дугуйлан дээр цуцлахад дэвшүүлэх хүн байхгүй", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Цуцлалт хязгааргүй",
      capacity: null,
      grades: [4],
    });

    try {
      const { rows } = await db.pool.query<{ result: RegResult[] }>(
        "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[]) as result",
        ["Ганц Сурагч", 4, "4-2", "88001122", [clubId]],
      );
      const regId = rows[0].result[0].registration_id!;

      const { rows: cancelRows } = await db.pool.query<{ result: Record<string, unknown> }>(
        "select public.cancel_registration($1) as result",
        [regId],
      );
      expect(cancelRows[0].result.cancelled).toBe(true);
      expect(cancelRows[0].result.promoted_registration_id).toBeNull();
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });
});

describe("Дүрмийн шалгалт", () => {
  it("нэг сурагч нэг дугуйланд ДАВХАР бүртгүүлэхгүй", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Давхардал",
      capacity: null,
      grades: [3],
    });

    try {
      const args = ["Болд Батаа", 3, "3-1", "99112233", [clubId]];
      await db.pool.query(
        "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[])",
        args,
      );
      const { rows } = await db.pool.query<{ result: RegResult[] }>(
        "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[]) as result",
        args,
      );
      expect(rows[0].result[0].status).toBe("duplicate");

      const counts = await countByStatus(clubId);
      expect(counts.registered).toBe(1);
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });

  it("нэг сурагч 2-оос илүү дугуйлан авахгүй (3 дахь нь limit_reached)", async () => {
    const a = await createTestClub(db.pool, { name: "ТЕСТ А", capacity: null, grades: [3] });
    const b = await createTestClub(db.pool, { name: "ТЕСТ Б", capacity: null, grades: [3] });
    const c = await createTestClub(db.pool, { name: "ТЕСТ В", capacity: null, grades: [3] });

    try {
      const { rows } = await db.pool.query<{ result: RegResult[] }>(
        "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[]) as result",
        ["Хязгаар Сурагч", 3, "3-2", "99887766", [a, b, c]],
      );
      const statuses = rows[0].result.map((r) => r.status);
      expect(statuses.filter((s) => s === "registered")).toHaveLength(2);
      expect(statuses.filter((s) => s === "limit_reached")).toHaveLength(1);
    } finally {
      for (const id of [a, b, c]) await dropTestClub(db.pool, id);
    }
  });

  it("тохирохгүй анги бүртгүүлэхгүй", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Зөвхөн 1-р анги",
      capacity: null,
      grades: [1],
    });

    try {
      const { rows } = await db.pool.query<{ result: RegResult[] }>(
        "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[]) as result",
        ["Буруу Ангийн Сурагч", 5, "5-1", "99112233", [clubId]],
      );
      expect(rows[0].result[0].status).toBe("grade_mismatch");
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });

  it("буруу утасны дугаарыг ӨС хүлээж авахгүй", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Утас",
      capacity: null,
      grades: [2],
    });

    try {
      await expect(
        db.pool.query(
          "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[])",
          ["Утас Сурагч", 2, "2-1", "1234", [clubId]],
        ),
      ).rejects.toThrow(/УТАС_БУРУУ/);
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });

  it("буруу бүлгийг хүлээж авахгүй", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Бүлэг",
      capacity: null,
      grades: [2],
    });

    try {
      await expect(
        db.pool.query(
          "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[])",
          ["Бүлэг Сурагч", 2, "7-1", "99112233", [clubId]],
        ),
      ).rejects.toThrow(/БҮЛЭГ_БУРУУ/);
    } finally {
      await dropTestClub(db.pool, clubId);
    }
  });
});

describe("Seed өгөгдөл", () => {
  it("50 дугуйлан, 8 нь 15 суудалтай", async () => {
    const { rows } = await db.pool.query<{ niit: string; hyazgaartai: string }>(
      `select count(*)::text as niit,
              count(*) filter (where capacity is not null)::text as hyazgaartai
         from public.clubs where sort_order < 9999`,
    );
    expect(Number(rows[0].niit)).toBe(50);
    expect(Number(rows[0].hyazgaartai)).toBe(8);
  });

  it("Шатар (3-р анги) 7 хоногт 2 УДАА хичээллэнэ", async () => {
    const { rows } = await db.pool.query<{ weekday: number; start_time: string }>(
      `select s.weekday, s.start_time::text
         from public.clubs c
         join public.club_sessions s on s.club_id = c.id
        where c.name = 'Шатар' and c.grades = '{3}'::smallint[]
        order by s.weekday`,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].weekday).toBe(1); // Даваа
    expect(rows[1].weekday).toBe(5); // Баасан
  });

  it("27 ангийн бүлэг бүртгэлтэй", async () => {
    const { rows } = await db.pool.query<{ n: string }>(
      "select count(*)::text as n from public.class_groups",
    );
    expect(Number(rows[0].n)).toBe(27);
  });
});
