import {
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Networks,
  NotFoundError,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'

export const HORIZON_URL = 'https://horizon-testnet.stellar.org'
export const FRIENDBOT_URL = 'https://friendbot.stellar.org'
export const NETWORK_PASSPHRASE = Networks.TESTNET
export const EXPLORER_TX_URL = 'https://stellar.expert/explorer/testnet/tx'
export const EXPLORER_ACCOUNT_URL = 'https://stellar.expert/explorer/testnet/account'

const server = new Horizon.Server(HORIZON_URL)

export interface BalanceLine {
  asset: string
  amount: string
}

export interface PaymentRecord {
  id: string
  direction: 'sent' | 'received' | 'funded'
  counterparty: string
  amount: string
  asset: string
  txHash: string
  createdAt: string
}

/** Loads all balances for an account. Returns null when the account is not funded yet. */
export async function fetchBalances(address: string): Promise<BalanceLine[] | null> {
  try {
    const account = await server.loadAccount(address)
    return account.balances.map((line) => ({
      asset: line.asset_type === 'native' ? 'XLM' : ('asset_code' in line ? line.asset_code : 'unknown'),
      amount: line.balance,
    }))
  } catch (err) {
    if (err instanceof NotFoundError) return null
    throw err
  }
}

/** Asks Friendbot to fund (create) a testnet account with 10,000 XLM. */
export async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`)
  if (!res.ok) {
    const body: { detail?: string } | null = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Friendbot request failed (${res.status})`)
  }
}

/**
 * Builds an XLM payment, asks Freighter to sign it, and submits it to Horizon.
 * Returns the transaction hash on success.
 */
export async function sendPayment(params: {
  from: string
  to: string
  amount: string
  memo?: string
}): Promise<string> {
  const sourceAccount = await server.loadAccount(params.from)

  const builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(
    Operation.payment({
      destination: params.to,
      asset: Asset.native(),
      amount: params.amount,
    }),
  )

  if (params.memo?.trim()) builder.addMemo(Memo.text(params.memo.trim()))

  const tx = builder.setTimeout(180).build()

  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: params.from,
  })
  if (signed.error) throw new Error(signed.error.message ?? 'Freighter refused to sign the transaction')

  const signedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE)

  try {
    const result = await server.submitTransaction(signedTx)
    return result.hash
  } catch (err) {
    throw new Error(horizonErrorMessage(err))
  }
}

/** Fetches the most recent payment operations touching this account. */
export async function fetchRecentPayments(address: string, limit = 5): Promise<PaymentRecord[]> {
  const page = await server.payments().forAccount(address).order('desc').limit(limit).call()

  const records: PaymentRecord[] = []
  for (const op of page.records) {
    if (op.type === 'payment') {
      records.push({
        id: op.id,
        direction: op.from === address ? 'sent' : 'received',
        counterparty: op.from === address ? op.to : op.from,
        amount: op.amount,
        asset: op.asset_type === 'native' ? 'XLM' : (op.asset_code ?? 'unknown'),
        txHash: op.transaction_hash,
        createdAt: op.created_at,
      })
    } else if (op.type === 'create_account') {
      records.push({
        id: op.id,
        direction: 'funded',
        counterparty: op.funder,
        amount: op.starting_balance,
        asset: 'XLM',
        txHash: op.transaction_hash,
        createdAt: op.created_at,
      })
    }
  }
  return records
}

/** Turns a Horizon submit error into a human-readable message. */
function horizonErrorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } }
    message?: string
  }
  const codes = e.response?.data?.extras?.result_codes
  if (codes) {
    const parts = [codes.transaction, ...(codes.operations ?? [])].filter(Boolean)
    const known: Record<string, string> = {
      op_underfunded: 'Insufficient balance to cover this payment.',
      op_no_destination: 'Destination account does not exist (fund it with Friendbot first).',
      tx_bad_seq: 'Bad sequence number — refresh and try again.',
      tx_insufficient_fee: 'Network fee too low — try again.',
    }
    for (const p of parts) {
      if (p && known[p]) return known[p]
    }
    return `Transaction failed: ${parts.join(', ')}`
  }
  return e.message ?? 'Transaction submission failed'
}

export function shortenKey(key: string, chars = 6): string {
  return key.length > chars * 2 + 3 ? `${key.slice(0, chars)}…${key.slice(-chars)}` : key
}
