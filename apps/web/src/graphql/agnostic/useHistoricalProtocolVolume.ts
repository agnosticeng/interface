import { useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { Chain, HistoricalProtocolVolumeQuery, HistoryDuration } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from './client'

const HISTORICAL_PROTOCOL_VOLUME_QUERY = gql`
  query HistoricalProtocolVolume($interval: String = "day", $duration: String = "month", $all_time: Boolean = false) {
    explore_historical_protocol_volume(interval: $interval, duration: $duration) @skip(if: $all_time) {
      timestamp
      volume_usd
    }

    explore_historical_protocol_volume_all_time @include(if: $all_time) {
      timestamp
      volume_usd
    }
  }
`

type AgnosticHistoricalProtocolVolumeResult = {
  explore_historical_protocol_volume?: { timestamp: string; volume_usd: string }[]
  explore_historical_protocol_volume_all_time?: { timestamp: string; volume_usd: string }[]
}

type AgnosticHistoricalProtocolVolumeVariables = {
  interval?: string
  duration?: string
  all_time?: boolean
}

export function useHistoricalProtocolVolumeQuery({
  variables,
}: {
  variables: { chain: Chain; duration: HistoryDuration }
}) {
  const { data, loading } = useQuery<AgnosticHistoricalProtocolVolumeResult, AgnosticHistoricalProtocolVolumeVariables>(
    HISTORICAL_PROTOCOL_VOLUME_QUERY,
    {
      client,
      variables: {
        interval: HistoryDurationToInterval(variables.duration),
        duration: HistoryDurationToDuration(variables.duration),
        all_time: variables.duration === HistoryDuration.Max,
      },
      skip: shouldSkip(variables.chain, variables.duration),
      context: {
        headers: {
          'Cache-control': 'max-age=86400',
          'X-Agnostic-Cache-Refresh-Trigger': '0.9',
        },
      },
    }
  )

  return { data: useMemo(() => transform(data), [data]), loading }
}

function HistoryDurationToInterval(duration: HistoryDuration) {
  if (duration === HistoryDuration.Month) return 'day'
  if (duration === HistoryDuration.Year) return 'week'
  if (duration === HistoryDuration.Max) return 'month'

  return undefined
}

function HistoryDurationToDuration(duration: HistoryDuration) {
  if (duration === HistoryDuration.Month) return 'month'
  if (duration === HistoryDuration.Year) return 'year'

  return undefined
}

function shouldSkip(chain: Chain, duration: HistoryDuration) {
  return (
    chain !== Chain.Ethereum || ![HistoryDuration.Month, HistoryDuration.Year, HistoryDuration.Max].includes(duration)
  )
}

function transform(data?: AgnosticHistoricalProtocolVolumeResult): HistoricalProtocolVolumeQuery | undefined {
  if (data?.explore_historical_protocol_volume?.length)
    return { v3HistoricalProtocolVolume: data.explore_historical_protocol_volume.map(mapper) }
  if (data?.explore_historical_protocol_volume_all_time?.length)
    return { v3HistoricalProtocolVolume: data.explore_historical_protocol_volume_all_time.map(mapper) }

  return undefined
}

function mapper(row: { timestamp: string; volume_usd: string }): {
  readonly __typename?: 'TimestampedAmount'
  readonly id: string
  readonly timestamp: number
  readonly value: number
} {
  return {
    id: window.btoa(`TimestampedAmount:${row.timestamp}_${row.volume_usd}`),
    timestamp: parseInt(row.timestamp, 10),
    value: parseFloat(row.volume_usd),
  }
}
