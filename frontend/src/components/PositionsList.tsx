// React import removed - not needed with new JSX transform
import type { PositionInfo } from '../api';

interface PositionsListProps {
  wallet: string;
  positions: PositionInfo[];
  onPositionClick?: (position: PositionInfo) => void;
}

export default function PositionsList({ wallet, positions, onPositionClick }: PositionsListProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  if (positions.length === 0) {
    return (
      <div className="positions-container">
        <h2>Positions for {formatAddress(wallet)}</h2>
        <div className="empty-state">
          <p>No Orca Whirlpool positions found for this wallet on mainnet.</p>
          <p>
            Make sure the wallet has created positions on Orca Whirlpools mainnet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="positions-container">
      <h2>Positions for {formatAddress(wallet)}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
        Found {positions.length} position{positions.length !== 1 ? 's' : ''}
      </p>

      <div className="positions-grid">
        {positions.map((position) => (
          <div
            key={position.nftMint}
            className="position-card"
            onClick={() => onPositionClick?.(position)}
            style={{ cursor: onPositionClick ? 'pointer' : 'default' }}
          >
            <div className="position-header">
              <div>
                <h3>
                  {position.tokenA}/{position.tokenB}
                </h3>
                <p style={{ margin: 'var(--spacing-xs) 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  NFT: {formatAddress(position.nftMint)}
                </p>
              </div>
              <div className={`status-badge ${position.inRange ? 'in-range' : 'out-of-range'}`}>
                {position.inRange ? '✓ In Range' : '⚠ Out of Range'}
              </div>
            </div>

            <div className="position-details">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Lower Tick</span>
                  <span className="detail-value">{position.tickLower.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Upper Tick</span>
                  <span className="detail-value">{position.tickUpper.toLocaleString()}</span>
                </div>
              </div>

              <div className="detail-item">
                <span className="detail-label">Liquidity</span>
                <span className="detail-value">{formatNumber(position.liquidity)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Current Price</span>
                <span className="detail-value">${formatNumber(position.currentPrice)}</span>
              </div>

              <div className="fees-section">
                <h4>Estimated Fees</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">{position.tokenA}</span>
                    <span className="detail-value">{formatNumber(position.estimatedFeesA)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{position.tokenB}</span>
                    <span className="detail-value">{formatNumber(position.estimatedFeesB)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}