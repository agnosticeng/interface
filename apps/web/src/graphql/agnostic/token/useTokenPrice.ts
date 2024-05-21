import { useQuery } from '@apollo/client'
import { TDPChartQueryVariables } from 'components/Tokens/TokenDetails/ChartSection/hooks'
import { gql } from 'graphql-tag'
import {
  Chain,
  HistoryDuration,
  TokenPriceQuery as TokenPriceQueryOriginal,
} from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from '../client'

const TOKEN_PRICE_QUERY = gql`
  query TokenPriceQuery($token: String, $duration: String!, $interval: String!, $isWETH: Boolean = false) {
    explore_token_market_price(token_address: $token, duration: $duration, interval: $interval) @skip(if: $isWETH) {
      timestamp
      value_usd
      open
      close
      min
      max
    }

    explore_weth_market_price(duration: $duration, interval: $interval) @include(if: $isWETH) {
      timestamp
      value_usd
      open
      close
      min
      max
    }
  }
`

type TokenPriceQuery = {
  explore_token_market_price?: {
    timestamp: string
    value_usd: string
    open: string
    close: string
    min: string
    max: string
  }[]
  explore_weth_market_price?: {
    timestamp: string
    value_usd: string
    open: string
    close: string
    min: string
    max: string
  }[]
}

type TokenPriceVariables = {
  token?: string
  duration: string
  interval: string
  isWETH?: boolean
}

type Input = {
  variables: TDPChartQueryVariables & { fallback?: boolean }
  skip?: boolean
}

export function useTokenPriceQuery(options: Input) {
  const { data, loading } = useQuery<TokenPriceQuery, TokenPriceVariables>(TOKEN_PRICE_QUERY, {
    client,
    variables: {
      token: options.variables.address,
      duration: durationMap[options.variables.duration],
      interval: intervalDurationMap[options.variables.duration],
      isWETH: !options.variables.address,
    },

    skip:
      options.skip ||
      options.variables.duration === HistoryDuration.FiveMinute ||
      options.variables.duration === HistoryDuration.Max ||
      options.variables.chain !== Chain.Ethereum,
  })

  return {
    loading,
    data: useMemo(
      () => transform(options.variables.address, data, options.variables.fallback),
      [data, options.variables.address, options.variables.fallback]
    ),
  }
}

function transform(
  token?: string,
  data?: TokenPriceQuery,
  fallback: boolean = false
): TokenPriceQueryOriginal | null | undefined {
  const prices = token ? data?.explore_token_market_price : data?.explore_weth_market_price
  if (!prices) return undefined
  const address = token ? token : '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

  return {
    token: {
      id: window.btoa(`Token:${address}`),
      address: token,
      chain: Chain.Ethereum,
      market: {
        id: window.btoa(`TokenMarket:${address}_USD`),
        ohlc: fallback
          ? undefined
          : prices.map((row) => {
              return {
                id: window.btoa(`TimestampedOhlc:${row.timestamp}`),
                open: {
                  id: window.btoa(`Amount:${row.open}_USD`),
                  value: parseFloat(row.open),
                },
                close: {
                  id: window.btoa(`Amount:${row.close}_USD`),
                  value: parseFloat(row.close),
                },
                low: {
                  id: window.btoa(`Amount:${row.min}_USD`),
                  value: parseFloat(row.min),
                },
                high: {
                  id: window.btoa(`Amount:${row.max}_USD`),
                  value: parseFloat(row.max),
                },
                timestamp: parseInt(row.timestamp, 10),
              }
            }),
        price: {
          id: window.btoa(`TokenPrice:${address}_USD`),
          value: parseFloat(prices[prices.length - 1].value_usd),
        },
        priceHistory: !fallback
          ? undefined
          : prices.map((row) => {
              return {
                id: window.btoa(`TimestampedAmount:${row.timestamp}`),
                value: parseFloat(row.value_usd),
                timestamp: parseInt(row.timestamp, 10),
              }
            }),
      },
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

const durationMap: Record<HistoryDuration, string> = {
  FIVE_MINUTE: '',
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  MAX: '',
}
