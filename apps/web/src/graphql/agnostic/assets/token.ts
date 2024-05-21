import { ApolloClient, InMemoryCache, QueryHookOptions, useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { Chain, Currency, TokenQuery, TokenStandard } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { useTokenMarketQuery } from '../token/useTokenMarket'

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
  const { data: market } = useTokenMarketQuery(options.variables?.address, options.skip)

  return {
    ...rest,
    data: useMemo(() => transform(data?.token, market), [data?.token, market]),
  }
}

function transform(
  token?: Query['token'],
  market?: ReturnType<typeof useTokenMarketQuery>['data']
): TokenQuery | undefined {
  if (!token || !market) return undefined

  return {
    token: {
      id: token.id,
      chain: token.chain,
      address: token.address,
      decimals: token.decimals,
      name: token.name,
      standard: token.standard,
      symbol: token.symbol,
      market: {
        id: market.id,
        price: {
          id: window.btoa(`Amount:${market.price}_USD`),
          value: market.price,
          currency: Currency.Usd,
        },
        priceHigh52W: {
          id: window.btoa(`Amount:${market.priceHigh52W}_USD`),
          value: market.priceHigh52W,
        },
        priceLow52W: {
          id: window.btoa(`Amount:${market.priceLow52W}_USD`),
          value: market.priceLow52W,
        },
        totalValueLocked: {
          id: window.btoa(`Amount:${market.totalValueLocked}_USD`),
          value: market.totalValueLocked,
        },
        volume24H: {
          id: window.btoa(`Amount:${market.volume24H}_USD`),
          value: market.volume24H,
        },
      },
      project: {
        ...token.project,
        tokens: [token],
      },
    },
  }
}
