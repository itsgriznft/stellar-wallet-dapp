import type { BalanceLine } from '../lib/stellar'

interface Props {
  balances: BalanceLine[] | null
  loading: boolean
  funding: boolean
  onRefresh: () => void
  onFund: () => void
}

export function BalanceCard({ balances, loading, funding, onRefresh, onFund }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Balances</h2>
        <button className="ghost small" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {balances === null ? (
        <>
          <p className="muted">
            This account doesn&apos;t exist on testnet yet. Fund it with Friendbot to receive
            10,000 test XLM.
          </p>
          <button className="primary" onClick={onFund} disabled={funding}>
            {funding ? 'Funding…' : 'Fund with Friendbot'}
          </button>
        </>
      ) : (
        <ul className="balance-list">
          {balances.map((line) => (
            <li key={line.asset}>
              <span className="asset">{line.asset}</span>
              <span className="amount">{Number(line.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
