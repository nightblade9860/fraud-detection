import dotenv from "dotenv";
import pg from "pg";
import { FLUSH_INTERVAL_MS } from "../utils/common-utils.js";
import logger from "../logs/logger.js";

dotenv.config();

const Pool = pg.Pool || pg.default?.Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, 
  },
});

// Holds pending data to be inserted into the db
export let pendingQueue = [];

/**
 * flushToDB
 *
 * Periodically flushes pending transactions from memory into the database.
 *
 * @async
 * @function
 * @returns {Promise<void>} Resolves once the pending transactions have been attempted to insert.
 *
 * @description
 * This function checks if there are any transactions in the `pendingQueue`.
 * If yes, it creates a copy (`toInsert`) and clears the `pendingQueue` to allow new
 * transactions to be queued while the current batch is being inserted.
 *
 * It then attempts to insert all transactions in `toInsert` into the database via `insertInDB`.
 * If the insertion succeeds, a log is generated indicating the number of transactions flushed.
 * If insertion fails, the failed transactions are prepended back to the `pendingQueue` 
 * so that they can be retried in the next flush interval, preserving their order.
 */
const flushToDB = async () => {
  if (pendingQueue.length === 0) return;

  // Snapshot the queue so new transactions can keep coming
  const toInsert = [...pendingQueue];

  try {
    await insertInDB(toInsert);
    logger.info(`Flushed ${toInsert.length} transactions to DB`);

    // Removing successfully inserted items
    pendingQueue = pendingQueue.slice(toInsert.length);
  } catch (err) {
    logger.error("Error flushing transactions:", err);
    logger.error("Retrying to persist data into the DB");
  }
};

// Start background flush
setInterval(() => {
  flushToDB().catch(err => logger.error("Unexpected error in flush interval:", err));
}, FLUSH_INTERVAL_MS);

/**
 * Inserts an array of transactions into the database atomically.
 * If any insert fails, the entire batch is rolled back.
 *
 * @async
 * @function insertInDB
 * @param {Array<Object>} transactions - List of transaction objects, each expected to have:
 *   - transaction_id: string
 *   - user_id: string
 *   - ip: string
 *   - amount: number
 *   - currency: string
 *   - created_at: string (ISO date)
 *
 * @throws {Error} Throws if the database operation fails. In that case, no transactions are inserted.
 */
const insertInDB = async (transactions) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN"); 

    for (const t of transactions) {
      await client.query(
        `INSERT INTO transactions(transaction_id, user_id, ip, amount, currency, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [t.transaction_id, t.user_id, t.ip, t.amount, t.currency, t.created_at]
      );
    }

    await client.query("COMMIT"); 
    logger.info(`Inserted ${transactions.length} transactions successfully.`);
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Transaction batch failed, rolled back:", err);
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
