import { ApolloClient, InMemoryCache } from '@apollo/client'

export const client = new ApolloClient({
  uri: 'https://graphql.eu-west-1.agnostic.engineering/graphql?Authorization=' + process.env.REACT_APP_AGNOSTIC_TOKEN,
  cache: new InMemoryCache({
    typePolicies: {
      explore_transactions: {
        keyFields: false,
      },
      explore_top_pools: {
        keyFields: ['address'],
      },
    },
  }),
  queryDeduplication: true,
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
})
