import { useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { Chain, PoolTransactionType, V3PoolTransactionsQuery } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from '../client'

const POOL_TRANSACTIONS = gql`
  query PoolTransactionQuery($pool: String!) {
    explore_pool_transactions(pool: $pool) {
      address
      account
      timestamp
      signature
      block_number
      transaction_index
      token0_address
      token0_symbol
      token0_quantity
      token1_address
      token1_symbol
      token1_quantity
      price_usd
    }
  }
`

type AgnosticPoolTransactionsResult = {
  explore_pool_transactions?: {
    address: string
    account: string
    timestamp: string
    signature: string
    block_number: string
    transaction_index: string
    token0_address: string
    token0_symbol: string
    token0_quantity: string
    token1_address: string
    token1_symbol: string
    token1_quantity: string
    price_usd: string
  }[]
}

type AgnosticPoolTransactionsVariables = {
  pool: string
}

function transform(pool: string, data?: AgnosticPoolTransactionsResult): V3PoolTransactionsQuery | undefined {
  if (!data?.explore_pool_transactions?.length) return undefined

  return {
    v3Pool: {
      id: window.btoa(`AgnosticPool:${pool}_ETHEREUM`),
      transactions: data.explore_pool_transactions.map((row) => {
        return {
          account: row.account,
          hash: `https://txr.agnostic.engineering?block=${row.block_number}&tx=${row.transaction_index}`,
          timestamp: new Date(row.timestamp).getTime() / 1000,
          token0: {
            id: window.btoa(`AgnosticToken:${row.token0_address}_ETHEREUM`),
            chain: Chain.Ethereum,
            address: row.token0_address,
            symbol: row.token0_symbol,
          },
          token0Quantity: row.token0_quantity,
          token1: {
            id: window.btoa(`AgnosticToken:${row.token1_address}_ETHEREUM`),
            chain: Chain.Ethereum,
            address: row.token1_address,
            symbol: row.token1_symbol,
          },
          token1Quantity: row.token1_quantity,
          type: row.signature.startsWith('Swap')
            ? PoolTransactionType.Swap
            : row.signature.startsWith('Burn')
            ? PoolTransactionType.Remove
            : PoolTransactionType.Add,
          usdValue: {
            id: window.btoa(`AgnosticAmount:${row.price_usd}_USD`),
            value: row.price_usd ? parseFloat(row.price_usd) : 0,
          },
        }
      }),
    },
  }
}

// eslint-disable-next-line import/no-unused-modules
export function useV3PoolTransactionsQuery(pool: string, skip: boolean) {
  const { data, ...rest } = useQuery<AgnosticPoolTransactionsResult, AgnosticPoolTransactionsVariables>(
    POOL_TRANSACTIONS,
    {
      client,
      fetchPolicy: 'network-only',
      context: { headers: { 'Cache-control': 'no-cache' } },
      variables: { pool },
      skip,
    }
  )

  return {
    data: useMemo(() => transform(pool, data), [data, pool]),
    ...rest,
  }
}
