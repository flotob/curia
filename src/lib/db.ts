import { Pool, PoolClient, QueryResult } from 'pg';

// Create database pool configuration
// Prioritize DATABASE_URL if available, otherwise use individual env vars
const createPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    console.log('[DB] Using DATABASE_URL for connection');
    return {
      connectionString: process.env.DATABASE_URL,
      max: 20, // Max number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // How long to wait for a connection from the pool
    };
  } else {
    console.log('[DB] Using individual PostgreSQL environment variables');
    return {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      user: process.env.POSTGRES_USER || 'plugin_user',
      password: process.env.POSTGRES_PASSWORD || 'plugin_password',
      database: process.env.POSTGRES_DB || 'plugin_db',
      max: 20, // Max number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // How long to wait for a connection from the pool
    };
  }
};

// Lazy pool creation - don't create until first use
let pool: Pool | null = null;
const getPool = () => {
  if (!pool) {
    console.log('[DB] Creating database pool...');
    pool = new Pool(createPoolConfig());
    
    pool.on('error', (err: Error, /* client: PoolClient */) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
};

export const query = async (text: string, values?: (string | number | boolean | null)[]): Promise<QueryResult> => {
  const start = Date.now();
  const client = await getPool().connect();
  try {
    const res = await client.query(text, values);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Error executing query', { text, values, err });
    throw err;
  } finally {
    client.release();
  }
};

// Function to get a client from the pool for manual transaction management
export async function getClient(): Promise<PoolClient> {
  try {
    return await getPool().connect();
  } catch (error) {
    console.error('Error getting database client:', error);
    throw new Error((error as Error).message || 'Failed to connect to database');
  }
}

// Optional: A way to gracefully close the pool when the application exits
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
}); 