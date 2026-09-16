import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestClub, setupTestDb, type TestDb } from "./helpers/testDb";

/**
 * 05_level_schedule.sql нь ХЭРЭГЛЭГЧ ГАРААРАА Supabase дээр ажиллуулдаг файл.
 * Тиймээс энэ файлыг жинхэнэ PostgreSQL дээр ажиллуулж шалгана —
 * жижиг бичлэгийн алдаа ч хэрэглэгчийн гар дээр л илэрдэг байсан.
 */
const SQL_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../supabase",
);
const MIGRATION = readFileSync(path.join(SQL_DIR, "05_level_schedule.sql"), "utf8");
const FUNCTIONS = readFileSync(path.join(SQL_DIR, "02_functions.sql"), "utf8");

/** Файлаас register_student функцийн эхийг таслаж авна */
function extractRegisterStudent(sql: string): string {
  const start = sql.indexOf("create or replace function public.register_student(");
  const end = sql.indexOf("\nend\n$$;", start);
  if (start < 0 || end < 0) throw new Error("register_student олдсонгүй");
  return sql.slice(start, end).trim();
}

let db: TestDb;

beforeAll(async () => {
  db = await setupTestDb();
}, 240_000);

afterAll(async () => {
  await db?.close();
});

/** Онцлогийг нь устгаж, "хуучин" өгөгдлийн санг дуурайна */
async function simulateOldDatabase() {
  await db.pool.query("drop table if exists public.level_schedule cascade");
  await db.pool.query("drop function if exists public.assert_level_open(smallint) cascade");
  await db.pool.query("drop function if exists public.level_of_grade(smallint) cascade");
}

describe("05_level_schedule.sql — гараар ажиллуулах файл", () => {
  it("02_functions.sql-тай ЯГ ижил register_student агуулсан (зөрөхгүй)", () => {
    // Хоёр файлд ижил функц байдаг. Аль нэгийг нь зассан мөртлөө нөгөөг
    // мартвал хэрэглэгчийн санд хуучин хувилбар үлдэнэ — үүнээс сэргийлнэ.
    expect(extractRegisterStudent(MIGRATION)).toBe(extractRegisterStudent(FUNCTIONS));
  });

  it("хуучин өгөгдлийн сан дээр алдаагүй ажиллана", async () => {
    await simulateOldDatabase();
    await expect(db.pool.query(MIGRATION)).resolves.toBeDefined();
  });

  it("хүснэгт үүсч, 3 түвшин зөв огноотой бөглөгдсөн", async () => {
    const { rows } = await db.pool.query(`
      select level,
             to_char(opens_at  at time zone 'Asia/Ulaanbaatar', 'YYYY-MM-DD HH24:MI') as opens_at,
             to_char(closes_at at time zone 'Asia/Ulaanbaatar', 'YYYY-MM-DD HH24:MI') as closes_at
        from public.level_schedule order by sort_order
    `);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      level: "baga",
      opens_at: "2026-09-21 00:00",
      closes_at: "2026-09-22 00:00",
    });
    expect(rows[1].level).toBe("dund");
    expect(rows[1].opens_at).toBe("2026-09-22 00:00");
    expect(rows[2].level).toBe("ahlah");
    expect(rows[2].opens_at).toBe("2026-09-23 00:00");
  });

  it("шинэчлэгдсэн register_student түвшний шалгалт хийдэг болсон", async () => {
    const clubId = await createTestClub(db.pool, {
      name: "ТЕСТ Миграци",
      grades: [7],
      capacity: null,
    });

    // Seed дэх огноогоор бол 7-р анги (дунд) зөвхөн 09-22-нд бүртгүүлнэ.
    // Өнөөдөр тэр өдөр биш тул татгалзах ёстой.
    await expect(
      db.pool.query(
        "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[])",
        ["Миграц Сурагч", 7, "7-1", "99000000", [clubId]],
      ),
    ).rejects.toThrow(/ТҮВШИН_(ЭХЛЭЭГҮЙ|ДУУССАН)/);

    // Хуваарийг нь нээвэл бүртгэнэ
    await db.pool.query(`
      update public.level_schedule
         set opens_at = now() - interval '1 hour', closes_at = now() + interval '1 hour'
       where level = 'dund'
    `);
    const { rows } = await db.pool.query(
      "select public.register_student($1, $2::smallint, $3, $4, $5::uuid[]) as r",
      ["Миграц Сурагч", 7, "7-1", "99000000", [clubId]],
    );
    expect(rows[0].r[0].status).toBe("registered");
  });

  it("ДАХИН ажиллуулахад ч алдаа өгөхгүй, огноог дарж бичихгүй", async () => {
    // Дээрх тестээр 'dund' огноог өөрчилсөн — дахин ажиллуулахад хэвээр үлдэх ёстой
    const before = await db.pool.query(
      "select opens_at from public.level_schedule where level = 'dund'",
    );
    await expect(db.pool.query(MIGRATION)).resolves.toBeDefined();
    const after = await db.pool.query(
      "select opens_at from public.level_schedule where level = 'dund'",
    );
    expect(after.rows[0].opens_at).toEqual(before.rows[0].opens_at);
  });

  it("anon хуваарийг УНШИЖ чадна, ӨӨРЧИЛЖ чадахгүй", async () => {
    const c = new (await import("pg")).default.Client({
      connectionString: db.connectionString,
    });
    await c.connect();
    try {
      await c.query("set role anon");
      const r = await c.query("select count(*)::int as n from public.level_schedule");
      expect(r.rows[0].n).toBe(3);

      // anon-д бичих эрх ОГТ өгөөгүй тул шууд татгалзана
      await expect(
        c.query("update public.level_schedule set opens_at = null where level = 'baga'"),
      ).rejects.toThrow(/permission denied/);

      const still = await db.pool.query(
        "select opens_at from public.level_schedule where level = 'baga'",
      );
      expect(still.rows[0].opens_at).not.toBeNull();
    } finally {
      await c.end().catch(() => {});
    }
  });
});
