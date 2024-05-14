import { useQuery } from '@apollo/client'
import { PDPChartQueryVars } from 'components/Pools/PoolDetails/ChartSection/hooks'
import { gql } from 'graphql-tag'
import { HistoryDuration, PoolPriceHistoryQuery } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from '../client'
import { durationMap } from './usePoolVolumeHistoryQuery'

const POOL_PRICE_HISTORY_QUERY = gql`
  query PoolPriceHistoryQuery($pool: String!, $interval: String!, $duration: String!) {
    explore_pool_price_history(pool: $pool, interval: $interval, duration: $duration) {
      date
      token0_price
      token1_price
    }
  }
`

type AgnosticPoolPriceHistoryResult = {
  explore_pool_price_history?: {
    date: string
    token0_price: string
    token1_price: string
  }[]
}

type AgnosticPoolPriceHistoryVariables = {
  pool: string
  interval: string
  duration: string
}

function transform(pool: string, data?: AgnosticPoolPriceHistoryResult): PoolPriceHistoryQuery | undefined {
  if (!data?.explore_pool_price_history?.length) return undefined

  return {
    v3Pool: {
      id: pool,
      priceHistory: data.explore_pool_price_history.map((row) => {
        const timestamp = new Date(row.date).getTime() / 1000
        return {
          id: window.btoa(`AgnosticPoolPrice:${timestamp}_${row.token0_price}_${row.token1_price}`),
          timestamp,
          token0Price: parseFloat(row.token0_price),
          token1Price: parseFloat(row.token1_price),
        }
      }),
    },
  }
}

const intervalDurationMap: Record<HistoryDuration, string> = {
  FIVE_MINUTE: '',
  HOUR: '1 minute',
  DAY: '1 hour',
  WEEK: '1 hour',
  MONTH: '4 hour',
  YEAR: '1 day',
  MAX: '',
}

export function usePoolPriceHistoryQuery({ variables }: { variables: PDPChartQueryVars }) {
  const { data, loading, error } = useQuery<AgnosticPoolPriceHistoryResult, AgnosticPoolPriceHistoryVariables>(
    POOL_PRICE_HISTORY_QUERY,
    {
      client,
      variables: {
        pool: variables.address,
        interval: intervalDurationMap[variables.duration],
        duration: durationMap[variables.duration],
      },
      skip:
        !variables.isV3 ||
        variables.duration === HistoryDuration.FiveMinute ||
        variables.duration === HistoryDuration.Max,
    }
  )

  return {
    data: useMemo(() => transform(variables.address, data), [variables.address, data]),
    loading,
    error: Boolean(error),
  }
}
