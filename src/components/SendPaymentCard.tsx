import { useState } from 'react'
import type { FormEvent } from 'react'
import { EXPLORER_TX_URL, sendPayment, shortenKey } from '../lib/stellar'
import { StrKey } from '@stellar/stellar-sdk'

interface Props {
  from: string
  disabled: boolean
  onSuccess: () => void
}

export function SendPaymentCard({ from, disabled, onSuccess }: Props) {
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLastTxHash(null)

    if (!StrKey.isValidEd25519PublicKey(to.trim())) {
      setError('Destination is not a valid Stellar public key (G…).')
      return
    }
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    if (memo.length > 28) {
      setError('Memo must be 28 characters or fewer.')
      return
    }

    setSending(true)
    try {
      const hash = await sendPayment({ from, to: to.trim(), amount: amount.trim(), memo })
      setLastTxHash(hash)
      setTo('')
      setAmount('')
      setMemo('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card">
      <h2>Send XLM</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Destination
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="G… public key"
            spellCheck={false}
            required
          />
        </label>
        <label>
          Amount (XLM)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            inputMode="decimal"
            required
          />
        </label>
        <label>
          Memo <span className="muted">(optional, max 28 chars)</span>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="First on-chain tx!" maxLength={28} />
        </label>
        <button className="primary" type="submit" disabled={disabled || sending}>
          {sending ? 'Signing & submitting…' : 'Sign & Send'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {lastTxHash && (
        <p className="success">
          Payment confirmed on-chain!{' '}
          <a href={`${EXPLORER_TX_URL}/${lastTxHash}`} target="_blank" rel="noreferrer">
            View tx {shortenKey(lastTxHash)}
          </a>
        </p>
      )}
    </div>
  )
}
