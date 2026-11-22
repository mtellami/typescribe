import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Migrations use a direct connection; request handlers use the pooled URL.
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/typescribe',
  max: 1,
  connectionTimeoutMillis: 15_000,
});
const db = drizzle(pool);

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
