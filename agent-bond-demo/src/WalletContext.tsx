import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface SolanaWindow extends Window {
  solana?: {
    isPhantom?: boolean;
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    on: (event: string, callback: () => void) => void;
    removeListener: (event: string, callback: () => void) => void;
    signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
  };
}

// 协议收款地址（devnet）
export const TREASURY_ADDRESS = new PublicKey('Hr5fZYwLXkquNomxDctvr3RaQ4N8kHMpRV6XJJxoiQKM');
const RPC_URL = 'https://api.devnet.solana.com';

export interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: () => void) => void;
  removeListener: (event: string, callback: () => void) => void;
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
}

interface WalletContextValue {
  connected: boolean;
  publicKey: string | null;
  isModalOpen: boolean;
  hasProvider: boolean;
  provider: PhantomProvider | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendSol: (amountSol: number) => Promise<string | null>;
  requestAirdrop: () => Promise<string | null>;
  setIsModalOpen: (v: boolean) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getProvider = useCallback((): PhantomProvider | null => {
    return (window as SolanaWindow).solana || null;
  }, []);

  const getConnection = useCallback(() => {
    return new Connection(RPC_URL, 'confirmed');
  }, []);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const handleConnect = () => {
      // 由 connect() 方法处理状态更新
    };
    const handleDisconnect = () => {
      setConnected(false);
      setPublicKey(null);
    };

    provider.on('connect', handleConnect);
    provider.on('disconnect', handleDisconnect);

    return () => {
      provider.removeListener('connect', handleConnect);
      provider.removeListener('disconnect', handleDisconnect);
    };
  }, [getProvider]);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    try {
      const resp = await provider.connect();
      setPublicKey(resp.publicKey.toString());
      setConnected(true);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Wallet connection failed', err);
    }
  }, [getProvider]);

  const disconnect = useCallback(async () => {
    const provider = getProvider();
    if (provider) {
      try {
        await provider.disconnect();
      } catch {
        // ignore
      }
    }
    setConnected(false);
    setPublicKey(null);
  }, [getProvider]);

  const sendSol = useCallback(async (amountSol: number): Promise<string | null> => {
    const provider = getProvider();
    if (!provider || !publicKey) {
      throw new Error('Wallet not connected');
    }
    const connection = getConnection();
    const fromPubkey = new PublicKey(publicKey);
    const lamports = amountSol * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey: TREASURY_ADDRESS,
        lamports,
      })
    );
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const { signature } = await provider.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  }, [getProvider, publicKey, getConnection]);

  const requestAirdrop = useCallback(async (): Promise<string | null> => {
    if (!publicKey) throw new Error('Wallet not connected');
    const connection = getConnection();
    const signature = await connection.requestAirdrop(new PublicKey(publicKey), LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  }, [publicKey, getConnection]);

  return (
    <WalletContext.Provider
      value={{
        connected,
        publicKey,
        isModalOpen,
        hasProvider: !!getProvider(),
        provider: getProvider(),
        connect,
        disconnect,
        sendSol,
        requestAirdrop,
        setIsModalOpen,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}
