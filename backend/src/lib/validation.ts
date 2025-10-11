import { PublicKey } from '@solana/web3.js';
import { ValidationError } from './errors.js';

export function validatePublicKey(publicKeyString: string): PublicKey {
  if (!publicKeyString || typeof publicKeyString !== 'string') {
    throw new ValidationError('Public key is required and must be a string');
  }

  const trimmed = publicKeyString.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('Public key cannot be empty');
  }

  try {
    return new PublicKey(trimmed);
  } catch (error) {
    throw new ValidationError('Invalid public key format');
  }
}

export function validateNFTMint(mintString: string): PublicKey {
  if (!mintString || typeof mintString !== 'string') {
    throw new ValidationError('NFT mint address is required and must be a string');
  }

  const trimmed = mintString.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('NFT mint address cannot be empty');
  }

  try {
    return new PublicKey(trimmed);
  } catch (error) {
    throw new ValidationError('Invalid NFT mint address format');
  }
}

export function validateRequiredEnvVars(): void {
  const required = ['HELIUS_API_KEY', 'ORCA_WHIRLPOOLS_PROGRAM_ID'];
  
  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove any potentially dangerous characters but keep alphanumeric and basic symbols
  return input.replace(/[^\w\s.-]/gi, '').trim();
}