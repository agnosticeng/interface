import { useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { AllV3TicksQuery } from 'graphql/thegraph/__generated__/types-and-hooks'
import ms from 'ms'
import { useMemo } from 'react'
import { client } from '../client'

const POOL_TICKS_QUERY = gql`
  query PoolTicksQuery($poolAddress: String = "") {
    explore_pool_liquidity(pool_address: $poolAddress) {
      tick
      liquidity_net
      price0
      price1
    }
  }
`

type PoolTicksQuery = {
  explore_pool_liquidity?: {
    tick: string
    liquidity_net: string
    price0: string
    price1: string
  }[]
}

type PoolTicksVariables = {
  poolAddress?: string
}

// eslint-disable-next-line import/no-unused-modules
export function usePoolTicksQuery(poolAddress?: string, skip = false) {
  const { data, ...rest } = useQuery<PoolTicksQuery, PoolTicksVariables>(POOL_TICKS_QUERY, {
    client,
    variables: { poolAddress },
    skip: !poolAddress || skip,
    pollInterval: ms(`30s`),
    context: {
      headers: {
        'Cache-control': 'no-cache',
      },
    },
  })

  return { ...rest, data: useMemo(() => transform(data), [data]) }
}

function transform(data?: PoolTicksQuery): AllV3TicksQuery | undefined {
  if (!data?.explore_pool_liquidity) return undefined

  return {
    ticks: data.explore_pool_liquidity.map((t) => ({
      liquidityNet: t.liquidity_net,
      price0: t.price0,
      price1: t.price1,
      tick: t.tick,
    })),
  }
}
