import { QueryHookOptions, useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { useMemo } from 'react'
import { client } from '../client'

const TOKEN_TVL_QUERY = gql`
  query TokenTVLQuery($token: String = "") {
    explore_token_tvl(token_address: $token) {
      total_value_locked
      tvl_usd
    }
  }
`

type TokenTVLQuery = {
  explore_token_tvl?: [{ total_value_locked: string; tvl_usd: string }]
}

type TokenTVLVariables = {
  token?: string
}

// eslint-disable-next-line import/no-unused-modules
export function useTokenTVLQuery(options?: Omit<QueryHookOptions<TokenTVLQuery, TokenTVLVariables>, 'client'>) {
  const { data, ...rest } = useQuery<TokenTVLQuery, TokenTVLVariables>(TOKEN_TVL_QUERY, {
    ...options,
    client,
  })

  return {
    ...rest,
    data: useMemo(() => {
      if (!data?.explore_token_tvl?.length) return undefined
      return {
        explore_token_tvl: {
          token: options?.variables?.token,
          total_value_locked: {
            amount: parseFloat(data.explore_token_tvl[0].total_value_locked),
            usd: parseFloat(data.explore_token_tvl[0].tvl_usd),
          },
        },
      }
    }, [data, options?.variables?.token]),
  }
}
