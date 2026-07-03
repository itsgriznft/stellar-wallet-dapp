import { EXPLORER_TX_URL, shortenKey } from '../lib/stellar'
import type { PaymentRecord } from '../lib/stellar'

interface Props {
  payments: PaymentRecord[]
  loading: boolean
}

const DIRECTION_LABEL: Record<PaymentRecord['direction'], string> = {
  sent: 'Sent to',
  received: 'Received from',
  funded: 'Funded by',
}

export function HistoryCard({ payments, loading }: Props) {
  return (
    <div className="card">
      <h2>Recent activity</h2>
      {loading && payments.length === 0 ? (
        <p className="muted">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="muted">No payments yet — send your first one above.</p>
      ) : (
        <ul className="history-list">
          {payments.map((p) => (
            <li key={p.id}>
              <div>
                <span className={`dir dir-${p.direction}`}>{DIRECTION_LABEL[p.direction]}</span>{' '}
                <span className="mono">{shortenKey(p.counterparty)}</span>
              </div>
              <div className="history-right">
                <span className="amount">
                  {p.direction === 'sent' ? '−' : '+'}
                  {Number(p.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })} {p.asset}
                </span>
                <a
                  className="tx-link"
                  href={`${EXPLORER_TX_URL}/${p.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  title={new Date(p.createdAt).toLocaleString()}
                >
                  tx ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
