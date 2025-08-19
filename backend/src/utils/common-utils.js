// IP prefixes and Currencies

export const bannedPrefixes = ["10.0.0.", "192.168.100."];
export const ipCurrencyMap = {
  "192.168.1.": "USD",
  "10.0.0.": "AED",
  "172.16.0.": "EUR",
  "192.168.100.": "INR",
  "10.1.1.": "GBP",
};
export const AMOUNT_LIMIT = 1000; 
export const ipPrefixes = ["192.168.1.", "10.0.0.", "172.16.0.", "192.168.100.", "10.1.1."];
export const currencies = ["USD", "AED", "EUR", "INR", "GBP"];
export const FRAUD_RULES = ["banned_region", "foreign_currency", "high_amount"];