import { ApolloClient, InMemoryCache, QueryHookOptions, useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { Chain, TokenStandard } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { useTokenTVLQuery } from '../token/useTokenTVL'

const client = new ApolloClient({
  uri: 'https://uniswap-assets.agnostic.dev/graphql',
  cache: new InMemoryCache(),
})

const UNISWAP_ASSETS_TOKEN_INFO = gql`
  query TokenInfo($address: String = "") {
    token(address: $address) {
      id
      chain
      address
      standard
      decimals
      name
      symbol
      project {
        id
        name
        description
        homepageUrl
        logoUrl
        twitterName
      }
    }
  }
`

type Token = {
  id: string
  chain: Chain
  address: string
  standard: TokenStandard
  decimals: number
  name: string
  symbol: string
  project: TokenProject
}

type TokenProject = {
  id: string
  name: string
  description: string
  homepageUrl?: string
  logoUrl: string
  twitterName?: string
}

type Query = { token?: Token }
type Variables = { address?: string }

// eslint-disable-next-line import/no-unused-modules
export function useTokenQuery(options: QueryHookOptions<Query, Variables>) {
  const { data, ...rest } = useQuery<Query, Variables>(UNISWAP_ASSETS_TOKEN_INFO, {
    ...options,
    client,
  })
  const { data: tvl } = useTokenTVLQuery({ variables: { token: options.variables?.address } })
  return {
    ...rest,
    data: useMemo(() => {
      return {
        token: {
          ...data?.token,
          market: {
            id: window.btoa(`TokenMarket:ETHEREUM_${data?.token?.address}_USD`),
            totalValueLocked: {
              id: window.btoa(`Amount:${tvl?.explore_token_tvl.total_value_locked.usd}_USD`),
              value: tvl?.explore_token_tvl.total_value_locked.usd,
              currency: 'USD',
            },
          },
        },
      }
    }, [data?.token, tvl?.explore_token_tvl.total_value_locked.usd]),
  }
}
