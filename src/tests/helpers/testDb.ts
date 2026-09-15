import { existsSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import EmbeddedPostgres from "embedded-postgres";

const SQL_DIR = fileURLToPath(new URL("../../../supabase", import.meta.url));
const SQL_FILES = [
  "01_schema.sql",
  "02_functions.sql",
  "03_policies.sql",
  "04_seed.sql",
];

export type TestDb = {
  /** Олон холболт зэрэг нээхэд ашиглана */
  connectionString: string;
  /** Ерөнхий үйлдэлд зориулсан pool */
  pool: pg.Pool;
  /** Хаана ажиллаж байгаа нь (мэдээллийн зорилгоор) */
  mode: "supabase" | "local";
  close: () => Promise<void>;
};

/**
 * Тестийн өгөгдлийн санг бэлдэнэ.
 *
 *  • DATABASE_URL тохируулсан бол ТҮҮН рүү холбогдоно
 *    (Supabase дээр аль хэдийн SQL-ээ ажиллуулсан гэж үзнэ).
 *  • Үгүй бол локал дээр ЖИНХЭНЭ PostgreSQL түр асааж,
 *    supabase/*.sql файлуудыг бүгдийг нь ажиллуулна. Docker шаардахгүй.
 */
export async function setupTestDb(): Promise<TestDb> {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const pool = new pg.Pool({ connectionString: url, max: 30 });
    return {
      connectionString: url,
      pool,
      mode: "supabase",
      close: async () => {
        await pool.end();
      },
    };
  }

  const dataDir = path.join(os.tmpdir(), `amjilt-pgtest-${process.pid}`);
  if (existsSync(dataDir)) rmSync(dataDir, { recursive: true, force: true });

  const port = Number(process.env.TEST_PG_PORT ?? 54329);
  const embedded = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=en_US.UTF-8"],
    // Өндөр ачааллын тест 200 холболт нэг зэрэг нээдэг
    postgresFlags: ["-c", "max_connections=400"],
    onLog: () => {},
    onError: () => {},
  });

  await embedded.initialise();
  await embedded.start();
  await embedded.createDatabase("amjilt_test");

  const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/amjilt_test`;

  const admin = new pg.Client({ connectionString });
  await admin.connect();

  // Supabase дээрх дүрүүдийг дуурайж үүсгэнэ (03_policies.sql эдгээрийг шаардана)
  await admin.query(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
    end
    $$;
  `);

  for (const file of SQL_FILES) {
    const sql = readFileSync(path.join(SQL_DIR, file), "utf8");
    try {
      await admin.query(sql);
    } catch (err) {
      await admin.end().catch(() => {});
      await embedded.stop().catch(() => {});
      throw new Error(`${file} ажиллуулахад алдаа: ${(err as Error).message}`);
    }
  }
  await admin.end();

  const pool = new pg.Pool({ connectionString, max: 30 });

  return {
    connectionString,
    pool,
    mode: "local",
    close: async () => {
      await pool.end().catch(() => {});
      await embedded.stop().catch(() => {});
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

/** Тестэд зориулж хязгаартай дугуйлан үүсгэнэ */
export async function createTestClub(
  pool: pg.Pool,
  opts: { name: string; capacity: number | null; grades: number[] },
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into public.clubs (name, level, grades, room, teacher, capacity, sort_order)
     values ($1, 'baga', $2::smallint[], 'ТЕСТ', 'Тест багш', $3, 9999)
     returning id`,
    [opts.name, opts.grades, opts.capacity],
  );
  return rows[0].id;
}

export async function dropTestClub(pool: pg.Pool, clubId: string): Promise<void> {
  await pool.query("delete from public.clubs where id = $1", [clubId]);
}
