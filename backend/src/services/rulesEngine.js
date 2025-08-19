import { bannedPrefixes, ipCurrencyMap, AMOUNT_LIMIT, FRAUD_RULES } from "../utils/common-utils.js";

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
