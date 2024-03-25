import { useQuery } from '@apollo/client'
import { PDPChartQueryVars } from 'components/Pools/PoolDetails/ChartSection/hooks'
import { gql } from 'graphql-tag'
import { HistoryDuration, PoolVolumeHistoryQuery } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from '../client'

const POOL_VOLUME_HISTORY_QUERY = gql`
  query PoolVolumeHistoryQuery($pool: String!, $interval: String!, $duration: String!) {
    explore_pool_volume_history(pool: $pool, interval: $interval, duration: $duration) {
      date
      volume_usd
    }
  }
`

type AgnosticPoolVolumeHistoryResult = {
  explore_pool_volume_history?: {
    date: string
    volume_usd: string
  }[]
}

type AgnosticPoolVolumeHistoryVariables = {
  pool: string
  interval: string
  duration: string
}

function transform(pool: string, data?: AgnosticPoolVolumeHistoryResult): PoolVolumeHistoryQuery | undefined {
  if (!data?.explore_pool_volume_history?.length) return undefined

  return {
    v3Pool: {
      id: pool,
      historicalVolume: data.explore_pool_volume_history.map((row) => {
        const timestamp = new Date(row.date).getTime() / 1000
        return {
          id: window.btoa(`AgnosticTimeAmount:${timestamp}_${row.volume_usd}`),
          value: parseFloat(row.volume_usd),
          timestamp,
        }
      }),
    },
  }
}

const intervalDurationMap: Record<HistoryDuration, string> = {
  FIVE_MINUTE: '',
  HOUR: '5 minute',
  DAY: '1 hour',
  WEEK: '6 hour',
  MONTH: '1 day',
  YEAR: '1 week',
  MAX: '',
}

function durationToString(d: HistoryDuration): string {
  switch (d) {
    case HistoryDuration.Hour:
      return 'hour'
    case HistoryDuration.Day:
      return 'day'
    case HistoryDuration.Week:
      return 'week'
    case HistoryDuration.Month:
      return 'month'
    case HistoryDuration.Year:
      return 'year'

    case HistoryDuration.FiveMinute:
    case HistoryDuration.Max:
    default:
      return ''
  }
}

export function usePoolVolumeHistoryQuery({ variables }: { variables: PDPChartQueryVars }) {
  const { data, loading, error } = useQuery<AgnosticPoolVolumeHistoryResult, AgnosticPoolVolumeHistoryVariables>(
    POOL_VOLUME_HISTORY_QUERY,
    {
      client,
      variables: {
        pool: variables.address,
        interval: intervalDurationMap[variables.duration],
        duration: durationToString(variables.duration),
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
