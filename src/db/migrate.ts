import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

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
