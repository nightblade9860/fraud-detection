import { bannedPrefixes, ipCurrencyMap, AMOUNT_LIMIT, FRAUD_RULES } from "../utils/common-utils.js";


/**
 * Applies fraud detection rules on a set of transaction records.
 * 
 * @function getAllDataWithRulesCheck
 * @param {Array<Object>} allRecords - List of transaction records.  
 *   Each record is expected to have at least:
 *   - {string} ip       - The source IP address of the transaction  
 *   - {string} currency - The transaction currency  
 *   - {number} amount   - The transaction amount
 * @param {Array<string>} rules - List of enabled fraud rules (from FRAUD_RULES).
 * 
 * @returns {Object} - Processed transaction data.
 * @property {Array<Object>} all        - All transactions with added `suspicious` and `reason` fields.
 * @property {Array<Object>} suspicious - Subset of only suspicious transactions.
 * 
 * @description
 * The function checks each record against a set of fraud detection rules:
 * 
 * 1. **Banned IP Prefix Rule** – Flags transactions originating from restricted IP ranges.  
 * 2. **Currency Mismatch Rule** – Flags transactions where the IP prefix maps to a different currency.  
 * 3. **High Amount Rule** – Flags transactions exceeding a defined threshold (`AMOUNT_LIMIT`).  
 * 
 * If a transaction violates one or more rules, it is marked as suspicious and the reasons are stored.
 */
export const getAllDataWithRulesCheck = (allRecords, rules) => {
  const suspiciousRecords = [];

  const updatedRecords = allRecords.map((record) => {
    let suspicious = false;
    let reason = [];

    const { ip, currency, amount } = record;
    const ipPrefix = ip.split(".").slice(0, 3).join(".") + ".";

    for (const rule of rules) {
      switch (rule) {
        case FRAUD_RULES[0]:
          if (bannedPrefixes.includes(ipPrefix)) {
            suspicious = true;
            reason.push(`Banned IP prefix: ${ipPrefix}`);
          }
          break;

        case FRAUD_RULES[1]:
          if (ipCurrencyMap[ipPrefix] && ipCurrencyMap[ipPrefix] !== currency) {
            suspicious = true;
            reason.push(`Currency mismatch for IP prefix: ${ipPrefix}`);
          }
          break;

        case FRAUD_RULES[2]:
          if (amount > AMOUNT_LIMIT) {
            suspicious = true;
            reason.push("High amount of transaction");
          }
          break;          
      }
    }

    const updatedRecord = {
      ...record,
      suspicious,
      reason,
    };

    if (suspicious) {
      suspiciousRecords.push(updatedRecord);
    }

    return updatedRecord;

  });

  return {
    all: updatedRecords,
    suspicious: suspiciousRecords,
  };
};
