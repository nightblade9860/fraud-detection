import { gql } from "apollo-server";

const typeDefs = gql`
  type Transaction {
    transaction_id: ID!
    user_id: ID!
    ip: String!
    amount: Float!
    currency: String!
    suspicious: Boolean!
    created_at: String!
  }

  type SuspiciousTransaction {
    transaction_id: ID!
    user_id: ID!
    reason: [String!]!
  }

  type Query {
    transactions: [Transaction!]!
    suspiciousTransactions: [SuspiciousTransaction!]!
  }

  type FilterResult {
    all: [Transaction!]!
    suspicious: [SuspiciousTransaction!]!
  }

  type Mutation {
    generateTransactions: Boolean!
    applyFraudRules(rules: [String!]!): FilterResult!
    sendEmail(to: String!): Boolean!
  }
`;

export default typeDefs;

