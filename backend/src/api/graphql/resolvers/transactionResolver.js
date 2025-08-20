import pool, { pendingQueue } from "../../../db/index.js";
import dotenv from "dotenv";
import { getAllDataWithRulesCheck } from "../../../services/rulesEngine.js";
import logger from "../../../logs/logger.js";
import { AMOUNT_LIMIT, ipPrefixes, ipCurrencyMap, currencies, bannedPrefixes } from "../../../utils/common-utils.js";

dotenv.config();

// In-memory caches
let cacheAll = { data: null };
let cacheSuspicious = { data: null };

/**
 * Checks if a given cache object has valid data.
 *
 * @function isCacheValid
 * @param {object} cache - Cache object with a `data` property.
 * @returns {boolean} - Returns true if the cache contains data, otherwise false.
 */
function isCacheValid(cache){  
  if (!cache.data) return false;
  return true;
};

/**
 * Generates a random IP address given a prefix.
 *
 * @function randomIp
 * @param {string} prefix - IP prefix (e.g., "192.168.").
 * @returns {string} - Returns a randomized IP address.
 */
function randomIp(prefix) {
  return prefix + Math.ceil(Math.random() * 255);
}

/**
 * Returns the valid currency for a given IP prefix.
 *
 * @function randomValidCurrencyForIp
 * @param {string} prefix - IP prefix.
 * @returns {string} - A currency code valid for that prefix.
 */
function randomValidCurrencyForIp(prefix) {
  return ipCurrencyMap[prefix];
}

/**
 * Returns a random currency that is different from the valid one for a given IP prefix.
 *
 * @function randomDifferentCurrency
 * @param {string} prefix - IP prefix.
 * @returns {string} - A currency code different from the prefix's valid currency.
 */
function randomDifferentCurrency(prefix) {
  const valid = ipCurrencyMap[prefix];
  let other = currencies[Math.floor(Math.random() * currencies.length)];
  while (other === valid) {
    other = currencies[Math.floor(Math.random() * currencies.length)];
  }
  return other;
}

/**
 * Returns the cache of suspicious transactions.
 *
 * @function getSuspiciousCache
 * @returns {Array<object>} - Array of suspicious transactions. Null pointer check skipped as handled by the caller.
 */
export const getSuspiciousCache = () => {
  return cacheSuspicious.data ;
}

/**
 * GraphQL resolvers for transaction-related queries and mutations.
 */
const transactionResolver = {
  Query: {
    /**
     * Fetches all transactions (from cache if available).
     * Adds default fields `suspicious: false` and `reason: []`.
     *
     * @async
     * @function transactions
     * @returns {Promise<Array<object>>} - List of transactions.
     */
    transactions: async () => {
      if (isCacheValid(cacheAll)) {
        return cacheAll.data;
      }
      try {
        const result = await pool.query("SELECT * FROM transactions ORDER BY created_at DESC");
        // Add suspicious and reason to each row as theyre not a part of the db
        const rowsWithDefaults = result.rows.map(r => ({
          ...r,
          suspicious: false,
          reason: []
        }));

        cacheAll = { data: rowsWithDefaults };
        return rowsWithDefaults;
      } catch (err) {
        logger.error("Error fetching transactions: ", err);
        return [];
      }
    },

     /**
     * Fetches suspicious transactions (from cache if available).
     *
     * @async
     * @function suspiciousTransactions
     * @returns {Promise<Array<object>>} - List of suspicious transactions.
     */
    suspiciousTransactions: async () => {
      if (isCacheValid(cacheSuspicious)) {
        return cacheSuspicious.data;
      }
      logger.info("No cache, returning empty data");
      return []
    },
  },

  Mutation: {
    /**
     * Generates a new batch of transactions (40 clean + 10 suspicious).
     * Clears existing DB data, generates mock transactions, and inserts them.
     *
     * @async
     * @function generateTransactions
     * @returns {Promise<boolean>} - Returns true if generation & insertion succeeded, false otherwise.
     */
    generateTransactions: async () => {
      cacheAll.data = null;
      cacheSuspicious.data = null;
      try {
        await pool.query("TRUNCATE TABLE transactions;");
      } catch (err) {
        logger.error("Error deleting existing transactions for generation of new data: ", err);
        return false;
      }

      const transactions = [];

      // Helper Methods for generating fair proportion of clean and suspicious records
      const makeTransaction = ({
        ip,
        currency,
        amount,
        suspicious = false,
        reason = []
      }) => ({
        transaction_id: Math.random().toString(16).slice(2, 8),
        user_id: Math.random().toString(16).slice(2, 8),
        ip,
        currency,
        amount,
        suspicious,
        reason,
        created_at: new Date().toISOString()
      });

      const pushClean = () => {
        const validPrefixes = ipPrefixes.filter(p => !bannedPrefixes.includes(p) && ipCurrencyMap[p]);
        const prefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
        transactions.push(
          makeTransaction({
            ip: randomIp(prefix),
            currency: randomValidCurrencyForIp(prefix),
            amount: parseFloat((Math.random() * (AMOUNT_LIMIT - 1)).toFixed(2))
          })
        );
      };

      const pushSuspicious = type => {
        let prefix = ipPrefixes[Math.floor(Math.random() * ipPrefixes.length)];
        let currency = randomValidCurrencyForIp(prefix);
        let amount = parseFloat((Math.random() * (AMOUNT_LIMIT - 1)).toFixed(2));
        let ip = randomIp(prefix);

        switch (type) {
          case "currency":
            currency = randomDifferentCurrency(prefix);
            break;

          case "banned": {
            prefix = bannedPrefixes[Math.floor(Math.random() * bannedPrefixes.length)];
            ip = randomIp(prefix);
            currency = ipCurrencyMap[prefix];
            break;
          }

          case "high":
            amount = AMOUNT_LIMIT + Math.floor(Math.random() * 500);
            break;

          case "currency+banned": {
            prefix = bannedPrefixes[Math.floor(Math.random() * bannedPrefixes.length)];
            ip = randomIp(prefix);
            currency = randomDifferentCurrency(prefix);
            break;
          }

          case "currency+high":
            currency = randomDifferentCurrency(prefix);
            amount = AMOUNT_LIMIT + Math.floor(Math.random() * 500);
            break;

          case "high+banned": {
            prefix = bannedPrefixes[Math.floor(Math.random() * bannedPrefixes.length)];
            ip = randomIp(prefix);
            currency = ipCurrencyMap[prefix];
            amount = AMOUNT_LIMIT + Math.floor(Math.random() * 500);
            break;
          }

          case "currency+high+banned": {
            prefix = bannedPrefixes[Math.floor(Math.random() * bannedPrefixes.length)];
            ip = randomIp(prefix);
            currency = randomDifferentCurrency(prefix);
            amount = AMOUNT_LIMIT + Math.floor(Math.random() * 500);
            break;
          }
        }

        transactions.push(
          makeTransaction({
            ip,
            currency,
            amount
          })
        );
      };

      // Generate Clean Records (40)
      for (let i = 0; i < 40; i++){
         pushClean();
      }
      // Generate Suspicious Records (10)
      const suspiciousCases = [
        "currency", "currency",
        "banned", "banned",
        "high", "high",
        "currency+banned",
        "currency+high",
        "high+banned",
        "currency+high+banned"
      ];

      for (const type of suspiciousCases) {
        pushSuspicious(type);
      }
      const rowsWithDefaults = transactions.map(t => ({
          ...t,
          suspicious: false,
          reason: []
        }));
      cacheAll = { data: rowsWithDefaults };
      pendingQueue.push(...transactions);
      return true;
    },
    /**
     * Applies fraud detection rules to all transactions.
     * Updates cache with flagged suspicious transactions.
     *
     * @function applyFraudRules
     * @param {object} _ - Parent resolver context (unused).
     * @param {object} args - Mutation arguments.
     * @param {Array<object>} args.rules - Fraud rules to apply.
     * @returns {object} - Object containing all transactions and suspicious transactions.
     */
    applyFraudRules(_, { rules }) {
      // Get all caches
      const allRecords = cacheAll.data || [];

      if (!rules || rules.length === 0) {
        logger.info("No rules sent!");
        // Reset suspicion and reaon in cache memory as false and [] respectively as theres no suspicious data anymore
        const resetRecords = allRecords.map(r => ({
          ...r,
          suspicious: false,
          reason: []
        }));
        cacheSuspicious.data = null
        return {
          all: resetRecords,
          suspicious: []
        };
      }

      // Apply rules
      const { all: allFiltered, suspicious: fraudFiltered } = getAllDataWithRulesCheck(allRecords, rules);

      // Reassign caches
      cacheAll.data = allFiltered;
      cacheSuspicious.data = fraudFiltered;

      return {
        all: allFiltered,
        suspicious: fraudFiltered
      };
    },
  },
};

export default transactionResolver;


