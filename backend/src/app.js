import { ApolloServer } from "apollo-server";
import typeDefs from "./api/graphql/schema.js";
import transactionResolver from "./api/graphql/resolvers/transactionResolver.js";
import emailResolvers from "./api/graphql/resolvers/emailResolver.js";
import logger from "./logs/logger.js";

const server = new ApolloServer({
  typeDefs,
  resolvers: {
    Query: {
      ...transactionResolver.Query,
    },
    Mutation: {
      ...transactionResolver.Mutation,
      ...emailResolvers.Mutation
    },
  },
});

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  logger.info("-------STARTING THE APPLICATION-------");
}).catch((err) => {
  logger.error(`Server failed to start: ${err.message}`);
});
