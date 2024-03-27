import { ChainId } from '@uniswap/sdk-core'
import { useTopV2PairsQuery } from 'graphql/data/__generated__/types-and-hooks'
import { PoolTableSortState, TablePool, V2_BIPS, calculateTurnover, sortPools } from 'graphql/data/pools/useTopPools'

import { useTopPoolsFromTokenQuery } from 'graphql/agnostic/pools/usePoolsFromTokenAddress'
import { useCallback, useMemo, useRef } from 'react'

const DEFAULT_QUERY_SIZE = 20

export function usePoolsFromTokenAddress(tokenAddress: string, sortState: PoolTableSortState, chainId?: ChainId) {
  const {
    loading: loadingV3,
    error: errorV3,
    data: dataV3,
    fetchMore: fetchMoreV3,
  } = useTopPoolsFromTokenQuery(tokenAddress, chainId !== ChainId.MAINNET)

  const {
    loading: loadingV2,
    error: errorV2,
    data: dataV2,
    fetchMore: fetchMoreV2,
  } = useTopV2PairsQuery({
    variables: {
      first: DEFAULT_QUERY_SIZE,
      tokenAddress,
    },
    skip: true || chainId !== ChainId.MAINNET,
  })
  const loading = loadingV3 || loadingV2
  const error = errorV3 || errorV2

  const loadingMoreV3 = useRef(false)
  const loadingMoreV2 = useRef(false)
  const sizeRef = useRef(DEFAULT_QUERY_SIZE)
  const loadMore = useCallback(
    ({ onComplete }: { onComplete?: () => void }) => {
      if (chainId !== ChainId.MAINNET) return
      if (loadingMoreV3.current || (loadingMoreV2.current && chainId === ChainId.MAINNET)) {
        return
      }
      loadingMoreV3.current = true
      loadingMoreV2.current = true
      sizeRef.current += DEFAULT_QUERY_SIZE
      fetchMoreV3(() => {
        loadingMoreV3.current = false
      })
      chainId === ChainId.MAINNET &&
        fetchMoreV2({
          variables: {
            cursor: dataV2?.topV2Pairs?.[dataV2.topV2Pairs.length - 1]?.totalLiquidity?.value,
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult || !prev || !Object.keys(prev).length) return prev
            if (!loadingMoreV3.current) onComplete?.()
            const mergedData = {
              topV2Pairs: [...(prev.topV2Pairs ?? []).slice(), ...(fetchMoreResult.topV2Pairs ?? []).slice()],
            }
            loadingMoreV2.current = false
            return mergedData
          },
        })
    },
    [chainId, dataV2?.topV2Pairs, fetchMoreV2, fetchMoreV3]
  )

  return useMemo(() => {
    const topV3Pools: TablePool[] =
      dataV3?.topV3Pools?.map((pool) => {
        return {
          hash: pool.address,
          token0: pool.token0,
          token1: pool.token1,
          txCount: pool.txCount,
          tvl: pool.totalLiquidity?.value,
          volume24h: pool.volume24h?.value,
          volumeWeek: pool.volumeWeek?.value,
          turnover: calculateTurnover(pool.volume24h?.value, pool.totalLiquidity?.value, pool.feeTier),
          feeTier: pool.feeTier,
          protocolVersion: pool.protocolVersion,
        } as TablePool
      }) ?? []
    const topV2Pairs: TablePool[] =
      dataV2?.topV2Pairs?.map((pool) => {
        return {
          hash: pool.address,
          token0: pool.token0,
          token1: pool.token1,
          txCount: pool.txCount,
          tvl: pool.totalLiquidity?.value,
          volume24h: pool.volume24h?.value,
          volumeWeek: pool.volumeWeek?.value,
          turnover: calculateTurnover(pool.volume24h?.value, pool.totalLiquidity?.value, V2_BIPS),
          feeTier: V2_BIPS,
          protocolVersion: pool.protocolVersion,
        } as TablePool
      }) ?? []

    const pools = sortPools([...topV3Pools, ...topV2Pairs], sortState).slice(0, sizeRef.current)
    return { loading, error, pools, loadMore }
  }, [dataV2?.topV2Pairs, dataV3?.topV3Pools, error, loadMore, loading, sortState])
}
