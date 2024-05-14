import { useQuery } from '@apollo/client'
import { gql } from 'graphql-tag'
import { Chain, PoolTransactionType, V3TokenTransactionsQuery } from 'graphql/data/__generated__/types-and-hooks'
import { useMemo } from 'react'
import { client } from '../client'

const TOKEN_TRANSACTIONS_QUERY = gql`
  query TokenTransactionQuery($token: String!) {
    explore_token(token_address: $token) {
      address
      name
      symbol
      decimals
      price_USD
    }

    explore_token_transactions(token_address: $token) {
      pool_address
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

type AgnosticTokenTransactionResult = {
  explore_token?: [
    {
      address: string
      name: string
      symbol: string
      decimals: string
      price_USD: string
    }
  ]
  explore_token_transactions?: {
    pool_address: string
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

type AgnosticTokenTransactionVariables = {
  token: string
}

// eslint-disable-next-line import/no-unused-modules
export function useTokenTransactionQuery(token: string) {
  const { data, ...rest } = useQuery<AgnosticTokenTransactionResult, AgnosticTokenTransactionVariables>(
    TOKEN_TRANSACTIONS_QUERY,
    {
      client,
      variables: { token },
      fetchPolicy: 'network-only',
      context: { headers: { 'Cache-control': 'no-cache' } },
    }
  )

  return { data: useMemo(() => transform(data), [data]), ...rest }
}

function transform(data?: AgnosticTokenTransactionResult): V3TokenTransactionsQuery | undefined {
  if (!data?.explore_token?.length || !data?.explore_token_transactions?.length) return undefined
  const [token] = data.explore_token

  return {
    token: {
      id: window.btoa(`AgnosticToken:${token.address}`),
      chain: Chain.Ethereum,
      address: token.address,
      decimals: parseInt(token.decimals, 10),
      symbol: token.symbol,
      v3Transactions: data.explore_token_transactions.map((row) => {
        return {
          account: row.account,
          hash: `https://txr.agnostic.engineering?block=${row.block_number}&tx=${row.transaction_index}`,
          timestamp: parseInt(row.timestamp),
          token0: {
            id: window.btoa(`AgnosticToken:${row.token0_address}_ETHEREUM`),
            chain: Chain.Ethereum,
            address: row.token0_address,
            symbol: row.token0_symbol.replace(/"/g, ''),
          },
          token0Quantity: row.token0_quantity,
          token1: {
            id: window.btoa(`AgnosticToken:${row.token1_address}_ETHEREUM`),
            chain: Chain.Ethereum,
            address: row.token1_address,
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
    },
  }
}
