import { useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { Chain, ProtocolVersion, TopV3PoolsQuery } from 'graphql/data/__generated__/types-and-hooks'
import { useCallback, useMemo, useRef } from 'react'
import { client } from '../client'

const TOP_POOLS_FROM_TOKEN_QUERY = gql`
  query TopPoolsFromTokenQuery($token: String!, $limit: String!, $offset: String!) {
    explore_top_pools_from_token(token_address: $token, limit: $limit, offset: $offset) {
      address
      tx_count
      fee_tier
      token0_address
      token0_symbol
      token1_address
      token1_symbol
      tvl_usd
      volume_24h_usd
      volume_7days_usd
    }
  }
`

type AgnosticTopPoolsFromTokenResult = {
  explore_top_pools_from_token?: {
    address: string
    tx_count: string
    fee_tier: string
    token0_address: string
    token0_symbol: string
    token1_address: string
    token1_symbol: string
    tvl_usd: string
    volume_24h_usd: string
    volume_7days_usd: string
  }[]
}

type AgnosticTopPoolsFromTokenVariables = {
  token: string
  limit: string
  offset: string
}

export function useTopPoolsFromTokenQuery(token: string, skip = false) {
  const { data, loading, error, fetchMore } = useQuery<
    AgnosticTopPoolsFromTokenResult,
    AgnosticTopPoolsFromTokenVariables
  >(TOP_POOLS_FROM_TOKEN_QUERY, {
    client,
    variables: {
      token,
      limit: '20',
      offset: '0',
    },
    skip,
  })

  const offsetRef = useRef(20)

  return {
    data: useMemo(() => transform(data), [data]),
    loading,
    error,
    fetchMore: useCallback(
      (callback?: () => void) => {
        if (skip || !data?.explore_top_pools_from_token || loading) return
        fetchMore({
          variables: { token, limit: '20', offset: `${offsetRef.current}` },
          updateQuery(previousQueryResult, options) {
            if (!options.fetchMoreResult) return previousQueryResult

            const next = previousQueryResult.explore_top_pools_from_token?.concat(
              ...(options.fetchMoreResult?.explore_top_pools_from_token ?? [])
            )
            offsetRef.current = next?.length ?? 20
            callback?.()
            return { explore_top_pools_from_token: next }
          },
        })
      },
      [fetchMore, token, skip, loading, data]
    ),
  }
}

function transform(data?: AgnosticTopPoolsFromTokenResult): TopV3PoolsQuery | undefined {
  if (!data?.explore_top_pools_from_token?.length) return undefined

  return {
    topV3Pools: data.explore_top_pools_from_token.map((row) => {
      return {
        id: window.btoa(`AgnosticPool:${row.address}_ETHEREUM`),
        address: row.address,
        protocolVersion: ProtocolVersion.V3,
        txCount: parseInt(row.tx_count, 10),
        feeTier: parseInt(row.fee_tier, 10),
        totalLiquidity: {
          value: parseFloat(row.tvl_usd),
        },
        volume24h: {
          value: parseFloat(row.volume_24h_usd),
        },
        volumeWeek: {
          value: parseFloat(row.volume_7days_usd),
        },
        token0: {
          id: window.btoa(`AgnosticToken:${row.token0_address}_ETHEREUM`),
          chain: Chain.Ethereum,
          address: row.token0_address,
          // decimals: parseInt(row.token0_decimals, 10),
          // name: row.token0_name.replace(/"/g, ''),
          symbol: row.token0_symbol.replace(/"/g, ''),
        },
        token1: {
          id: window.btoa(`AgnosticToken:${row.token1_address}_ETHEREUM`),
          chain: Chain.Ethereum,
          address: row.token1_address,
          // decimals: parseInt(row.token1_decimals, 10),
          // name: row.token1_name.replace(/"/g, ''),
          symbol: row.token1_symbol.replace(/"/g, ''),
        },
      }
    }),
  }
}
