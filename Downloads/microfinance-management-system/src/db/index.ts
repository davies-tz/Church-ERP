import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    const host = process.env.SQL_HOST;
    const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER;
    const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;
    const database = process.env.SQL_DB_NAME;

    if (!host || !user || !password || !database) {
      throw new Error('Database credentials (SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME) are missing.');
    }

    poolInstance = new Pool({
      host,
      user,
      password,
      database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: false,
    });

    dbInstance = drizzle(poolInstance, { schema });
  }

  return { db: dbInstance, pool: poolInstance! };
}
