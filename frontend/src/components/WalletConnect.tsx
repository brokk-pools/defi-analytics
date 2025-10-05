import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';

interface WalletConnectProps {
  onWalletSelect: (publicKey: string) => void;
  loading: boolean;
}

export default function WalletConnect({ onWalletSelect, loading }: WalletConnectProps) {
  const [publicKeyInput, setPublicKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKeyInput.trim()) {
      setError('Please enter a public key');
      return;
    }

    try {
      // Validate the public key format
      new PublicKey(publicKeyInput.trim());
      setError(null);
      onWalletSelect(publicKeyInput.trim());
    } catch (err) {
      setError('Invalid public key format');
    }
  };

  const handleExampleClick = () => {
    // Example devnet wallet for testing
    const exampleKey = '11111111111111111111111111111112';
    setPublicKeyInput(exampleKey);
    setError(null);
  };

  return (
    <div className="wallet-connect">
      <h2>Enter Wallet Public Key</h2>
      <p>Enter a Solana wallet public key to view Orca Whirlpool positions on devnet:</p>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            value={publicKeyInput}
            onChange={(e) => setPublicKeyInput(e.target.value)}
            placeholder="Enter public key (e.g., 11111111111111111111111111111112)"
          />
          
          <div className="input-actions">
            <button
              type="button"
              onClick={handleExampleClick}
              className="secondary"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            >
              Use Example
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={loading ? 'loading' : ''}
          style={{ width: '100%' }}
        >
          {loading ? 'Loading positions...' : 'Fetch Positions'}
        </button>
      </form>

      <div className="info-box">
        <h3>Note:</h3>
        <p>
          This MVP is configured for Solana Devnet. Make sure the wallet you're checking has 
          interacted with Orca Whirlpools on devnet.
        </p>
      </div>
    </div>
  );
}