import { useQuery } from '@apollo/client'
import { ChainId } from '@uniswap/sdk-core'
import { WETH_ADDRESS } from '@uniswap/universal-router-sdk'
import { gql } from 'graphql-tag'
import { useMemo } from 'react'
import { client } from '../client'

const TOKEN_MARKET_QUERY = gql`
  query TokenMarketQuery($address: String!) {
    explore_token(token_address: $address) {
      address
      name
      symbol
      decimals
      price_USD
      current_year_min_USD_price
      current_year_max_USD_price
    }

    explore_token_volume(token_address: $address) {
      volume_24h_usd
    }

    explore_token_tvl(token_address: $address) {
      total_value_locked
      tvl_usd
    }
  }
`

type TokenMarketQuery = {
  explore_token?: [
    {
      address: string
      name: string
      symbol: string
      decimals: string
      price_USD: string
      current_year_min_USD_price: string
      current_year_max_USD_price: string
    }
  ]
  explore_token_volume?: [{ volume_24h_usd: string }]
  explore_token_tvl?: [{ total_value_locked: string; tvl_usd: string }]
}

type TokenMarketVariables = {
  address: string
}

// eslint-disable-next-line import/no-unused-modules
export function useTokenMarketQuery(address: string = WETH_ADDRESS(ChainId.MAINNET), skip = false) {
  const { data, error, loading } = useQuery<TokenMarketQuery, TokenMarketVariables>(TOKEN_MARKET_QUERY, {
    client,
    variables: { address },
    skip,
  })

  return {
    data: useMemo(() => transform(data), [data]),
    error,
    loading,
  }
}

function transform(data?: TokenMarketQuery) {
  const token = data?.explore_token?.[0]
  const volume = data?.explore_token_volume?.[0]
  const tvl = data?.explore_token_tvl?.[0]
  if (!token || !volume || !tvl) return undefined

  return {
    id: window.btoa(`Token:${token.address}`),
    address: token.address,
    price: parseFloat(token.price_USD),
    priceHigh52W: parseFloat(token.current_year_max_USD_price),
    priceLow52W: parseFloat(token.current_year_min_USD_price),
    volume24H: parseFloat(volume.volume_24h_usd),
    totalValueLocked: parseFloat(tvl.tvl_usd),
  }
}
