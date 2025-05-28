import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'plugin_user',
  password: process.env.POSTGRES_PASSWORD || 'plugin_password',
  database: process.env.POSTGRES_DB || 'plugin_db',
  max: 20, // Max number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection from the pool
});

pool.on('error', (err: Error, client: PoolClient) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Error executing query', { text, params, err });
    throw err;
  } finally {
    client.release();
  }
};

// Function to get a client from the pool for manual transaction management
export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  return client;
};

// Optional: A way to gracefully close the pool when the application exits
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
}); 