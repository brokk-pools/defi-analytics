import { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import PositionsList from './components/PositionsList';
import PositionSkeleton from './components/PositionSkeleton';
import { fetchWalletPositions, checkApiHealth } from './api';
import type { WalletPositionsResponse, PositionInfo } from './api';

function App() {
  const [positionsData, setPositionsData] = useState<WalletPositionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Check API health on component mount
    checkApiHealth()
      .then(() => setApiStatus('online'))
      .catch(() => setApiStatus('offline'));
  }, []);

  const handleWalletSelect = async (publicKey: string) => {
    setLoading(true);
    setError(null);
    setPositionsData(null);

    try {
      const data = await fetchWalletPositions(publicKey);
      setPositionsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  const handlePositionClick = (position: PositionInfo) => {
    console.log('Position clicked:', position);
    // In a full implementation, you might navigate to a detailed view
    // or show a modal with more position details
  };

  const handleReset = () => {
    setPositionsData(null);
    setError(null);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Orca Whirlpools MVP</h1>
        <p>
          Track your liquidity positions and fees on Solana Mainnet
        </p>
        
        <div className={`status-indicator ${apiStatus}`}>
          <span>
            {apiStatus === 'checking' ? 'Checking API...' : 
             apiStatus === 'online' ? '✓ API Online' : '⚠ API Offline'}
          </span>
        </div>
      </header>

      <main>
        {loading ? (
          <PositionSkeleton count={2} />
        ) : !positionsData ? (
          <WalletConnect 
            onWalletSelect={handleWalletSelect} 
            loading={loading}
          />
        ) : (
          <div>
            <div style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
              <button 
                onClick={handleReset}
                className="secondary"
              >
                ← Check Different Wallet
              </button>
            </div>
            
            <PositionsList
              wallet={positionsData.wallet}
              positions={positionsData.positions}
              onPositionClick={handlePositionClick}
            />
          </div>
        )}

        {error && (
          <div className="error-container">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Orca Whirlpools MVP - Built for Solana Mainnet</p>
        <p>
          Backend endpoints: /wallet/:publicKey | /position/:nftMint | /webhook/helius
        </p>
      </footer>
    </div>
  );
}

export default App;