import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import {
  Chain,
  PoolTransactionType,
  ProtocolVersion,
  V3TransactionsQuery,
  V3TransactionsQueryVariables,
} from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from '../client'

const ALL_TRANSACTIONS_QUERY = gql`
  {
    transactions_pools {
      address
      account
      timestamp
      signature
      block_hash
      block_number
      transaction_index
      token0_address
      token0_name
      token0_symbol
      token0_decimals
      token0_quantity
      token1_address
      token1_name
      token1_symbol
      token1_decimals
      token1_quantity
      price_usd
    }
  }
`

type AgnosticAllTransactionsResult = {
  transactions_pools?: {
    address: string
    account: string
    timestamp: string
    signature: string
    block_hash: string
    block_number: string
    transaction_index: string
    token0_address: string
    token0_name: string
    token0_symbol: string
    token0_decimals: string
    token0_quantity: string
    token1_address: string
    token1_name: string
    token1_symbol: string
    token1_decimals: string
    token1_quantity: string
    price_usd: string
  }[]
}

function transform(data?: AgnosticAllTransactionsResult): V3TransactionsQuery | undefined {
  if (!data?.transactions_pools) return undefined

  return {
    v3Transactions: data.transactions_pools.map((row) => {
      return {
        id: window.btoa(`AgnosticTransaction:${row.address}_ETHEREUM`),
        account: row.account,
        chain: Chain.Ethereum,
        hash: `https://txr.agnostic.engineering?block=${row.block_number}&tx=${row.transaction_index}`,
        protocolVersion: ProtocolVersion.V3,
        timestamp: new Date(row.timestamp).getTime() / 1000,
        token0: {
          id: window.btoa(`AgnosticToken:${row.token0_address}_ETHEREUM`),
          chain: Chain.Ethereum,
          address: row.token0_address,
          decimals: parseInt(row.token0_decimals, 10),
          name: row.token0_name.replace(/"/g, ''),
          symbol: row.token0_symbol.replace(/"/g, ''),
        },
        token0Quantity: row.token0_quantity,
        token1: {
          id: window.btoa(`AgnosticToken:${row.token1_address}_ETHEREUM`),
          chain: Chain.Ethereum,
          address: row.token1_address,
          decimals: parseInt(row.token1_decimals, 10),
          name: row.token1_name.replace(/"/g, ''),
          symbol: row.token1_symbol.replace(/"/g, ''),
        },
        token1Quantity: row.token1_quantity,
        type: row.signature.startsWith('Swap')
          ? PoolTransactionType.Swap
          : row.signature.startsWith('Burn')
          ? PoolTransactionType.Remove
          : PoolTransactionType.Add,
        usdValue: {
          id: '',
          value: row.price_usd ? parseFloat(row.price_usd) : 0,
        },
      }
    }),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useV3TransactionsQuery(v: any) {
  const { data, ...rest } = useQuery<AgnosticAllTransactionsResult, V3TransactionsQueryVariables>(
    ALL_TRANSACTIONS_QUERY,
    {
      client,
      fetchPolicy: 'network-only',
      context: { headers: { 'Cache-control': 'no-cache' } },
    }
  )

  return {
    data: useMemo(() => transform(data), [data]),
    ...rest,
  }
}
