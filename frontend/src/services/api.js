const API_URL = "https://fraud-detection-1-kict.onrender.com";

export const fetchTransactions = async () => {
  const query = `
    query {
      transactions {
        transaction_id
        user_id
        ip
        amount
        currency
        suspicious
        created_at
      }
    }
  `;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return data.data.transactions;
};

export const fetchSuspicious = async () => {
  const query = `
    query {
      suspiciousTransactions {
        transaction_id
        user_id
        reason
      }
    }
  `;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return data.data.suspiciousTransactions;
};

export const generateData = async () => {
  const mutation = `
    mutation {
      generateTransactions
    }
  `;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: mutation }),
  });
  const data = await res.json();
  return data.data.generateTransactions; 
};

export const applyRules = async (rules) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation ApplyFraudRules($rules: [String!]!) {
          applyFraudRules(rules: $rules) {
            all {
              transaction_id
              user_id
              ip
              amount
              currency
              suspicious
              created_at
            }
            suspicious {
              transaction_id
              user_id
              reason
            }
          }
        }
      `,
      variables: { rules },
    }),
  });

  const result = await response.json();
  return result.data.applyFraudRules;
};

export const sendEmail = async (toEmail) => {
  const mutation = `
    mutation SendEmail($to: String!) {
      sendEmail(to: $to)
    }
  `;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: mutation,
      variables: { to: toEmail },
    }),
  });
  const data = await res.json();
  return data.data.sendEmail; 
};
