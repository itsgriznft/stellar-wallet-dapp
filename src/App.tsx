import { useCallback, useEffect, useState } from 'react'
import { getNetworkDetails, isConnected, requestAccess } from '@stellar/freighter-api'
import { ConnectCard } from './components/ConnectCard'
import { BalanceCard } from './components/BalanceCard'
import { SendPaymentCard } from './components/SendPaymentCard'
import { HistoryCard } from './components/HistoryCard'
import { fetchBalances, fetchRecentPayments, fundWithFriendbot } from './lib/stellar'
import type { BalanceLine, PaymentRecord } from './lib/stellar'
import './App.css'

const STORAGE_KEY = 'stellar-dapp:connected'

function App() {
  const [freighterMissing, setFreighterMissing] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [network, setNetwork] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const [balances, setBalances] = useState<BalanceLine[] | null>(null)
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [funding, setFunding] = useState(false)

  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const [globalError, setGlobalError] = useState<string | null>(null)

  const refreshAccount = useCallback(async (addr: string) => {
    setBalancesLoading(true)
    setPaymentsLoading(true)
    setGlobalError(null)
    try {
      const [balanceLines, recent] = await Promise.all([
        fetchBalances(addr),
        fetchRecentPayments(addr).catch(() => [] as PaymentRecord[]),
      ])
      setBalances(balanceLines)
      setPayments(recent)
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to load account data')
    } finally {
      setBalancesLoading(false)
      setPaymentsLoading(false)
    }
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    setGlobalError(null)
    try {
      const access = await requestAccess()
      if (access.error || !access.address) {
        throw new Error(access.error?.message ?? 'Freighter denied access')
      }
      const details = await getNetworkDetails()
      setAddress(access.address)
      setNetwork(details.network ?? null)
      localStorage.setItem(STORAGE_KEY, '1')
      await refreshAccount(access.address)
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setConnecting(false)
    }
  }, [refreshAccount])

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAddress(null)
    setNetwork(null)
    setBalances(null)
    setPayments([])
    setGlobalError(null)
  }, [])

  const fund = useCallback(async () => {
    if (!address) return
    setFunding(true)
    setGlobalError(null)
    try {
      await fundWithFriendbot(address)
      await refreshAccount(address)
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Friendbot funding failed')
    } finally {
      setFunding(false)
    }
  }, [address, refreshAccount])

  // On load: detect Freighter and silently reconnect if previously connected.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const detected = await isConnected()
      if (cancelled) return
      if (detected.error || !detected.isConnected) {
        setFreighterMissing(true)
        return
      }
      if (localStorage.getItem(STORAGE_KEY)) {
        await connect()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connect])

  const onTestnet = network !== null && network.toUpperCase() === 'TESTNET'

  return (
    <div className="app">
      <header>
        <h1>
          <span className="logo">✦</span> Stellar Wallet dApp
        </h1>
        <p className="subtitle">
          White Belt · Level 1 — connect a wallet, handle balances, send your first on-chain
          transaction on Stellar testnet.
        </p>
      </header>

      {globalError && <p className="error banner">{globalError}</p>}

      <main>
        <ConnectCard
          address={address}
          network={network}
          connecting={connecting}
          freighterMissing={freighterMissing}
          onConnect={connect}
          onDisconnect={disconnect}
        />

        {address && (
          <>
            <BalanceCard
              balances={balances}
              loading={balancesLoading}
              funding={funding}
              onRefresh={() => refreshAccount(address)}
              onFund={fund}
            />
            {balances !== null && (
              <>
                <SendPaymentCard
                  from={address}
                  disabled={!onTestnet}
                  onSuccess={() => refreshAccount(address)}
                />
                <HistoryCard payments={payments} loading={paymentsLoading} />
              </>
            )}
          </>
        )}
      </main>

      <footer>
        <p className="muted">
          Runs on Stellar <strong>testnet</strong> · Built with React, Vite,{' '}
          <a href="https://developers.stellar.org/" target="_blank" rel="noreferrer">
            stellar-sdk
          </a>{' '}
          &amp;{' '}
          <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
            Freighter
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
