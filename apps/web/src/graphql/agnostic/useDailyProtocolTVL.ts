import { useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { Chain } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from './client'

const HISTORICAL_PROTOCOL_TVL_QUERY = gql`
  query HistoricalProtocolTVL {
    explore_daily_protocol_tvl_v3 {
      timestamp
      tvl_usd
    }
  }
`

type AgnosticHistoricalProtocolTVLResult = {
  explore_daily_protocol_tvl_v3?: { timestamp: string; tvl_usd: string }[]
}

export function useDailyProtocolTvlQuery({ variables }: { variables: { chain: Chain } }) {
  const { data, loading } = useQuery<AgnosticHistoricalProtocolTVLResult>(HISTORICAL_PROTOCOL_TVL_QUERY, {
    client,
    skip: variables.chain !== Chain.Ethereum,
    context: {
      headers: {
        'Cache-control': 'max-age=86400',
        'X-Agnostic-Cache-Refresh-Trigger': '0.9',
      },
    },
  })

  return {
    data: useMemo(
      () => ({ v3DailyProtocolTvl: data?.explore_daily_protocol_tvl_v3?.map(mapper), v2DailyProtocolTvl: undefined }),
      [data]
    ),
    loading,
  }
}

function mapper(row: { timestamp: string; tvl_usd: string }): {
  readonly __typename?: 'TimestampedAmount'
  readonly id: string
  readonly timestamp: number
  readonly value: number
} {
  return {
    id: window.btoa(`TimestampedAmount:${row.timestamp}_${row.tvl_usd}`),
    timestamp: parseInt(row.timestamp, 10),
    value: parseFloat(row.tvl_usd),
  }
}
