import { useQuery } from '@apollo/client'
import { ChainId } from '@uniswap/sdk-core'
import { gql } from 'graphql-tag'
import { Chain, ProtocolVersion } from 'graphql/data/__generated__/types-and-hooks'
import type { PoolData } from 'graphql/data/pools/usePoolData'
import { useMemo } from 'react'
import { client } from '../client'

const POOL_QUERY = gql`
  query PoolDataQuery($pool: String!) {
    explore_pool(pool: $pool) {
      address
      fee_tier
      tx_count
      token0_address
      token0_name
      token0_symbol
      token0_decimals
      token0_price_usd
      token0_locked
      token1_address
      token1_name
      token1_symbol
      token1_decimals
      token1_price_usd
      token1_locked
      volume_24h_usd
      tvl_usd
      tvl_change_24h_percent
      volume_change_24h_percent
    }
  }
`

type AgnosticPoolResult = {
  explore_pool?:
    | [
        {
          address: string
          fee_tier: string
          tx_count: string
          token0_address: string
          token0_name: string
          token0_symbol: string
          token0_decimals: string
          token0_price_usd: string
          token0_locked: string
          token1_address: string
          token1_name: string
          token1_symbol: string
          token1_decimals: string
          token1_price_usd: string
          token1_locked: string
          volume_24h_usd: string
          tvl_usd: string
          tvl_change_24h_percent: string
          volume_change_24h_percent: string
        }
      ]
    | []
}

type AgnosticPoolVariables = {
  pool: string
}

function transform(data?: AgnosticPoolResult): PoolData | undefined {
  if (!data?.explore_pool?.[0]) return undefined
  const pool = data.explore_pool[0]
  return {
    address: pool.address,
    feeTier: parseInt(pool.fee_tier),
    protocolVersion: ProtocolVersion.V3,
    txCount: parseInt(pool.tx_count, 10),
    token0: {
      id: window.btoa(`AgnosticToken:${pool.token0_address}_ETHEREUM`),
      chain: Chain.Ethereum,
      address: pool.token0_address,
      decimals: parseInt(pool.token0_decimals, 10),
      name: pool.token0_name.replace(/"/g, ''),
      symbol: pool.token0_symbol.replace(/"/g, ''),
    },
    token0Price: parseFloat(pool.token0_price_usd),
    tvlToken0: parseFloat(pool.token0_locked),
    token1: {
      id: window.btoa(`AgnosticToken:${pool.token1_address}_ETHEREUM`),
      chain: Chain.Ethereum,
      address: pool.token1_address,
      decimals: parseInt(pool.token1_decimals, 10),
      name: pool.token1_name.replace(/"/g, ''),
      symbol: pool.token1_symbol.replace(/"/g, ''),
    },
    token1Price: parseFloat(pool.token1_price_usd),
    tvlToken1: parseFloat(pool.token1_locked),
    tvlUSD: parseFloat(pool.tvl_usd),
    tvlUSDChange: parseFloat(pool.tvl_change_24h_percent),
    volumeUSD24H: parseFloat(pool.volume_24h_usd),
    volumeUSD24HChange: parseFloat(pool.volume_change_24h_percent),
  }
}

export function usePoolData(pool: string, chain?: ChainId): { data?: PoolData; loading: boolean; error: boolean } {
  const { data, loading, error } = useQuery<AgnosticPoolResult, AgnosticPoolVariables>(POOL_QUERY, {
    client,
    variables: { pool },
    skip: pool.length === 0 || chain !== ChainId.MAINNET,
  })
  return {
    data: useMemo(() => transform(data), [data]),
    loading,
    error: Boolean(error),
  }
}
