import pool from "../../../db/index.js";
import dotenv from "dotenv";
import { getAllDataWithRulesCheck } from "../../../services/rulesEngine.js";
import logger from "../../../logs/logger.js";
import { AMOUNT_LIMIT, ipPrefixes, ipCurrencyMap, currencies, bannedPrefixes } from "../../../utils/common-utils.js";

dotenv.config();

// In-memory caches
let cacheAll = { data: null };
let cacheSuspicious = { data: null };

function isCacheValid(cache){  
  if (!cache.data) return false;
  return true;
};

function randomIp(prefix) {
  return prefix + Math.ceil(Math.random() * 255);
}

function randomValidCurrencyForIp(prefix) {
  return ipCurrencyMap[prefix];
}

function randomDifferentCurrency(prefix) {
  const valid = ipCurrencyMap[prefix];
  let other = currencies[Math.floor(Math.random() * currencies.length)];
  while (other === valid) {
    other = currencies[Math.floor(Math.random() * currencies.length)];
  }
  return other;
}

export const getSuspiciousCache = () => {
  return cacheSuspicious.data ;
}

const insertInDB = async (transactions) => {
  try {
    const queries = transactions.map((t) =>
      pool.query(
        `INSERT INTO transactions(transaction_id, user_id, ip, amount, currency, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [t.transaction_id, t.user_id, t.ip, t.amount, t.currency, t.created_at]
      )
    );
    await Promise.all(queries); 
  } catch (err) {
    logger.error("Error inserting transactions: ", err);
  }
};

const transactionResolver = {
  Query: {
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

    suspiciousTransactions: async () => {
      if (isCacheValid(cacheSuspicious)) {
        return cacheSuspicious.data;
      }
      logger.info("No cache, returning empty data");
      return []
    },
  },

  Mutation: {
    generateTransactions: async () => {
      cacheAll.data = null;
      cacheSuspicious.data = null;
      try {
        await pool.query("TRUNCATE TABLE transactions;");
      } catch (err) {
        logger.error("Error deleting existing transactions for generation of new data: ", err);
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
      try {
        await insertInDB(transactions);
      } catch (err) {
        logger.error("Err during insertion: " + err);
        return false;
      }
      return true;
    },
    applyFraudRules(_, { rules }) {
      // Get all caches
      const allRecords = cacheAll.data || [];

      if (!rules || rules.length === 0) {
        logger.info("No rules sent!");
        cacheSuspicious.data = null
        return {
          all: allRecords,
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


