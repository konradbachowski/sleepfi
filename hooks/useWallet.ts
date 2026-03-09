import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getOrCreateUser, User } from '../lib/api';

let transact: any = null;
try {
  const mwa = require('@solana-mobile/mobile-wallet-adapter-protocol');
  transact = mwa.transact;
} catch {}

// Simple in-memory session store
const session: { wallet: string | null; user: User | null } = {
  wallet: null,
  user: null,
};

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(session.wallet);
  const [user, setUser] = useState<User | null>(session.user);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      let address: string;

      if (transact) {
        address = await transact(async (wallet: any) => {
          const authResult = await wallet.authorize({
            cluster: 'devnet',
            identity: {
              name: 'SleepFi',
              uri: 'https://sleepfi.heyneuron.pl',
              icon: '/icon.png',
            },
          });
          return new PublicKey(authResult.accounts[0].address).toBase58();
        });
      } else {
        // Dev fallback
        address = 'So1' + Math.random().toString(36).slice(2, 10).toUpperCase() + 'devnet';
      }

      session.wallet = address;
      setWalletAddress(address);

      const userData = await getOrCreateUser(address);
      session.user = userData;
      setUser(userData);

      return address;
    } catch (e: any) {
      const msg = e?.message || 'Wallet connection failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    session.wallet = null;
    session.user = null;
    setWalletAddress(null);
    setUser(null);
  }, []);

  const signAndSendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!transact) {
      return 'MockTx' + Date.now() + Math.random().toString(36).slice(2);
    }
    return await transact(async (wallet: any) => {
      const result = await wallet.signAndSendTransactions({
        transactions: [transaction],
      });
      return Buffer.from(result.signatures[0]).toString('base64');
    });
  }, []);

  return {
    walletAddress,
    user,
    connect,
    disconnect,
    connecting,
    error,
    isConnected: !!walletAddress,
    signAndSendTransaction,
  };
}
