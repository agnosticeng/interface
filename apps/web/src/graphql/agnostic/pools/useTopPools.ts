import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { Chain, ProtocolVersion, TopV3PoolsQuery } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from '../client'

const TOP_POOLS_QUERY = gql`
  {
    toppools_explore {
      address
      chain_name
      fee_tier
      last_block_number
      protocol_version
      token0_address
      token0_decimals
      token0_locked
      token0_name
      token0_symbol
      token1_address
      token1_decimals
      token1_locked
      token1_name
      token1_symbol
      tvl_usd
      tx_count
      volume24h_usd
      volume1week_usd
    }
  }
`

type AgnosticTopPoolResult = {
  toppools_explore?: {
    address: string
    chain_name: string
    fee_tier: string
    last_block_number: string
    protocol_version: string
    token0_address: string
    token0_decimals: string
    token0_locked: string
    token0_name: string
    token0_symbol: string
    token1_address: string
    token1_decimals: string
    token1_locked: string
    token1_name: string
    token1_symbol: string
    tvl_usd: string
    tx_count: string
    volume24h_usd: string
    volume1week_usd: string
  }[]
}

function transform(data?: AgnosticTopPoolResult): TopV3PoolsQuery | undefined {
  if (!data?.toppools_explore) return undefined

  return {
    topV3Pools: data?.toppools_explore?.map((raw) => {
      return {
        id: window.btoa(`AgnosticPool:${raw.address}_ETHEREUM`),
        address: raw.address,
        protocolVersion: ProtocolVersion.V3,
        feeTier: parseInt(raw.fee_tier, 10),
        token0: {
          id: window.btoa(`AgnosticToken:${raw.token0_address}_ETHEREUM`),
          chain: Chain.Ethereum,
          address: raw.token0_address,
          decimals: parseInt(raw.token0_decimals, 10),
          name: raw.token0_name.replace(/"/g, ''),
          symbol: raw.token0_symbol.replace(/"/g, ''),
        },
        token1: {
          id: window.btoa(`AgnosticToken:${raw.token1_address}_ETHEREUM`),
          chain: Chain.Ethereum,
          address: raw.token1_address,
          decimals: parseInt(raw.token1_decimals, 10),
          name: raw.token1_name.replace(/"/g, ''),
          symbol: raw.token1_symbol.replace(/"/g, ''),
        },
        totalLiquidity: {
          value: parseFloat(raw.tvl_usd),
        },
        txCount: parseInt(raw.tx_count, 10),
        volume24h: {
          value: parseFloat(raw.volume24h_usd),
        },
        volumeWeek: {
          value: parseFloat(raw.volume1week_usd),
        },
      }
    }),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useTopV3PoolsQuery(_: any) {
  const { data, error, loading } = useQuery<AgnosticTopPoolResult>(TOP_POOLS_QUERY, { client })

  return {
    data: useMemo(() => transform(data), [data]),
    error,
    loading,
  }
}
