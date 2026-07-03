import { EXPLORER_ACCOUNT_URL, shortenKey } from '../lib/stellar'

interface Props {
  address: string | null
  network: string | null
  connecting: boolean
  freighterMissing: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function ConnectCard({ address, network, connecting, freighterMissing, onConnect, onDisconnect }: Props) {
  if (freighterMissing) {
    return (
      <div className="card">
        <h2>Wallet</h2>
        <p className="muted">
          Freighter extension not detected. Install it from{' '}
          <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
            freighter.app
          </a>{' '}
          and reload this page.
        </p>
      </div>
    )
  }

  if (!address) {
    return (
      <div className="card">
        <h2>Wallet</h2>
        <p className="muted">Connect your Freighter wallet to get started.</p>
        <button className="primary" onClick={onConnect} disabled={connecting}>
          {connecting ? 'Waiting for Freighter…' : 'Connect Freighter'}
        </button>
      </div>
    )
  }

  const wrongNetwork = network !== null && network.toUpperCase() !== 'TESTNET'

  return (
    <div className="card">
      <div className="card-header">
        <h2>Wallet</h2>
        <span className={`badge ${wrongNetwork ? 'badge-warn' : 'badge-ok'}`}>
          {network ?? '…'}
        </span>
      </div>
      <p className="address" title={address}>
        <a href={`${EXPLORER_ACCOUNT_URL}/${address}`} target="_blank" rel="noreferrer">
          {shortenKey(address, 8)}
        </a>
        <button
          className="ghost small"
          onClick={() => navigator.clipboard.writeText(address)}
          title="Copy address"
        >
          Copy
        </button>
      </p>
      {wrongNetwork && (
        <p className="error">
          Freighter is on {network}. Switch it to <strong>Testnet</strong> to use this app.
        </p>
      )}
      <button className="ghost" onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  )
}
