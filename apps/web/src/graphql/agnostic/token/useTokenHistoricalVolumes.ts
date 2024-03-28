import { useQuery } from '@apollo/client'
import { TDPChartQueryVariables } from 'components/Tokens/TokenDetails/ChartSection/hooks'
import { gql } from 'graphql-tag'
import { Chain, HistoryDuration, TokenHistoricalVolumesQuery } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from '../client'

const TOKEN_VOLUME_HISTORY_QUERY = gql`
  query TokenVolumeHistory($token: String!, $interval: String!, $duration: String!) {
    explore_token_volume_history(token_address: $token, interval: $interval, duration: $duration) {
      timestamp
      volume_usd
    }
  }
`

const intervalDurationMap: Record<HistoryDuration, string> = {
  FIVE_MINUTE: '',
  HOUR: '5 minute',
  DAY: '1 hour',
  WEEK: '6 hour',
  MONTH: '1 day',
  YEAR: '1 week',
  MAX: '',
}

const durationMap: Record<HistoryDuration, string> = {
  FIVE_MINUTE: '',
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  MAX: '',
}

type AgnosticPoolVolumeHistoryResult = {
  explore_token_volume_history?: {
    timestamp: string
    volume_usd: string
  }[]
}

type AgnosticPoolVolumeHistoryVariables = {
  token: string
  interval: string
  duration: string
}

export function useTokenHistoricalVolumesQuery({
  variables,
  skip,
}: {
  variables: TDPChartQueryVariables
  skip: boolean
}) {
  const token = variables.address
    ? variables.address
    : variables.chain === Chain.Ethereum
    ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH address
    : ''
  const { data, ...rest } = useQuery<AgnosticPoolVolumeHistoryResult, AgnosticPoolVolumeHistoryVariables>(
    TOKEN_VOLUME_HISTORY_QUERY,
    {
      client,
      variables: {
        token,
        duration: durationMap[variables.duration],
        interval: intervalDurationMap[variables.duration],
      },
      skip:
        skip ||
        variables.duration === HistoryDuration.FiveMinute ||
        variables.duration === HistoryDuration.Max ||
        !token,
    }
  )

  return { data: useMemo(() => transform(token, data), [data, token]), ...rest }
}

function transform(token: string, data?: AgnosticPoolVolumeHistoryResult): TokenHistoricalVolumesQuery | undefined {
  if (!data?.explore_token_volume_history?.length) return undefined

  return {
    token: {
      id: token,
      chain: Chain.Ethereum,
      address: token,
      market: {
        id: window.btoa(`AgnosticMarketToken:${token}_ETHEREUM`),
        historicalVolume: data.explore_token_volume_history.map((row) => {
          return {
            id: window.btoa(`AgnosticTimestampedAmount:${row.timestamp}_${row.volume_usd}`),
            timestamp: parseInt(row.timestamp, 10),
            value: parseFloat(row.volume_usd),
          }
        }),
      },
    },
  }
}
