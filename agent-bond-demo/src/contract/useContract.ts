import { useState, useCallback } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { useWalletContext } from '../WalletContext';
import {
  buildDepositIx,
  buildExecuteSkillIx,
  fetchUserState,
  fetchAgentBond,
  TREASURY_ADDRESS,
} from './idl';

const RPC_URL = 'https://api.devnet.solana.com';

export function useAgentBondContract() {
  const { publicKey, connected, provider } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getConnection = useCallback(() => new Connection(RPC_URL, 'confirmed'), []);

  /** 链上充值 SOL */
  const deposit = useCallback(async (amountSol: number): Promise<string | null> => {
    if (!connected || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      if (!provider) throw new Error('Wallet provider not available');
      const connection = getConnection();
      const lamports = BigInt(Math.round(amountSol * 1e9));
      console.log('[Contract] Building deposit ix:', { publicKey, amountSol, lamports: lamports.toString() });
      
      const ix = buildDepositIx(new PublicKey(publicKey), lamports);
      console.log('[Contract] Instruction:', {
        programId: ix.programId.toBase58(),
        keysCount: ix.keys.length,
        dataLength: ix.data.length,
        dataHex: ix.data.toString('hex'),
      });
      
      const tx = new Transaction().add(ix);
      console.log('[Contract] Transaction instructions:', tx.instructions.map(i => ({
        programId: i.programId.toBase58(),
        dataLength: i.data.length,
      })));
      
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(publicKey);
      
      const { signature } = await provider.signAndSendTransaction(tx);
      console.log('[Contract] Deposit signature:', signature);
      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
    } catch (err: any) {
      console.error('[Contract] Deposit failed:', err);
      setError(err?.message || 'Deposit failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, provider, getConnection]);

  /** 链上调用 Skill */
  const executeSkill = useCallback(async (
    agentId: string,
    skillId: string,
    costSol: number,
    bondGain: number
  ): Promise<string | null> => {
    if (!connected || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    setError(null);
    try {
      if (!provider) throw new Error('Wallet provider not available');
      const connection = getConnection();
      const ix = buildExecuteSkillIx(
        new PublicKey(publicKey),
        agentId,
        skillId,
        BigInt(Math.round(costSol * 1e9)),
        BigInt(bondGain)
      );
      const tx = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(publicKey);
      const { signature } = await provider.signAndSendTransaction(tx);
      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
    } catch (err: any) {
      setError(err?.message || 'Execute skill failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey, provider, getConnection]);

  /** 读取链上用户状态 */
  const fetchOnChainState = useCallback(async () => {
    if (!publicKey) return null;
    const connection = getConnection();
    const userState = await fetchUserState(connection, new PublicKey(publicKey));
    return userState;
  }, [publicKey, getConnection]);

  /** 读取链上 AgentBond */
  const fetchOnChainBond = useCallback(async (agentId: string) => {
    if (!publicKey) return null;
    const connection = getConnection();
    return fetchAgentBond(connection, new PublicKey(publicKey), agentId);
  }, [publicKey, getConnection]);

  return {
    deposit,
    executeSkill,
    fetchOnChainState,
    fetchOnChainBond,
    loading,
    error,
    treasuryAddress: TREASURY_ADDRESS.toBase58(),
  };
}
