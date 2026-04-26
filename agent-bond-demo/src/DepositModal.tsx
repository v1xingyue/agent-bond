import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wallet, ArrowDownToLine, Loader2, ExternalLink } from 'lucide-react';
import { useBondStore } from './store';
import { useWalletContext } from './WalletContext';
import { useAgentBondContract } from './contract/useContract';

export function DepositModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const store = useBondStore();
  const { connected, publicKey, connect, hasProvider } = useWalletContext();
  const contract = useAgentBondContract();
  const [amount, setAmount] = useState<string>('0.5');
  const [step, setStep] = useState<'input' | 'signing' | 'confirming' | 'success' | 'error'>('input');
  const [txSig, setTxSig] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const balance = store.getCurrentBalance();

  const handleDeposit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    setStep('signing');
    setErrorMsg('');

    try {
      // 调用合约 Deposit：创建/更新 UserState PDA + 转账到 Treasury
      const signature = await contract.deposit(val);
      if (!signature) {
        throw new Error('Transaction failed');
      }
      setTxSig(signature);
      setStep('confirming');

      // 等待链上确认
      await new Promise((r) => setTimeout(r, 1500));

      // 更新本地余额
      store.deposit(val, signature);
      setStep('success');
      onSuccess?.();

      setTimeout(() => {
        setStep('input');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Deposit failed', err);
      setErrorMsg(err?.message || '交易失败，请重试');
      setStep('error');
    }
  };

  const devnetExplorer = txSig
    ? `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
    : '';

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center"
      style={{
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        paddingTop: '100px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
        className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'rgba(12, 12, 22, 0.95)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(153,69,255,0.15)' }}>
            <Wallet className="w-5 h-5 text-solana-purple" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">充值</h3>
            <p className="text-xs text-text-muted">向 Agent 羁绊协议存入 SOL</p>
          </div>
        </div>

        {/* 未连接钱包 */}
        {!connected && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-6 h-6 text-text-muted" />
            </div>
            <div className="text-sm text-text-secondary mb-4">
              请先连接 Phantom 钱包以完成充值
            </div>
            <button
              onClick={connect}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-solana-purple to-solana-blue text-white text-sm font-semibold shadow-lg shadow-solana-purple/20 hover:shadow-solana-purple/30 transition-shadow cursor-pointer"
            >
              {hasProvider ? '连接 Phantom' : '安装 Phantom 钱包'}
            </button>
          </div>
        )}

        {/* 已连接钱包 */}
        {connected && step === 'input' && (
          <>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-text-muted mb-2">
                <span>当前可用余额</span>
                <span className="font-mono text-text-primary">{balance.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between text-xs text-text-muted mb-2">
                <span>钱包地址</span>
                <span className="font-mono text-text-secondary">{publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}</span>
              </div>
              <div className="p-4 rounded-xl border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="text-xs text-text-muted mb-1">充值金额 (SOL)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-bold text-text-primary outline-none"
                    placeholder="0.0"
                    min="0.001"
                    step="0.1"
                  />
                  <span className="text-sm text-text-muted">SOL</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {['0.1', '0.5', '1.0', '2.0'].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                  style={{
                    background: amount === v ? 'rgba(153,69,255,0.15)' : 'rgba(255,255,255,0.03)',
                    borderColor: amount === v ? 'rgba(153,69,255,0.4)' : 'rgba(255,255,255,0.08)',
                    color: amount === v ? '#9945FF' : '#94A3B8',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-text-muted mb-4 text-center">
              充值将真实转账至协议账户，使用 Solana Devnet
            </div>

            <button
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-solana-purple to-solana-blue text-white text-sm font-semibold shadow-lg shadow-solana-purple/20 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-solana-purple/30 transition-shadow cursor-pointer"
            >
              确认充值
            </button>
          </>
        )}

        {/* 签名中 */}
        {step === 'signing' && (
          <div className="py-10 text-center">
            <Loader2 className="w-10 h-10 text-solana-purple animate-spin mx-auto mb-4" />
            <div className="text-sm text-text-primary font-medium mb-1">等待钱包签名</div>
            <div className="text-xs text-text-muted">请在 Phantom 弹窗中确认交易</div>
          </div>
        )}

        {/* 确认中 */}
        {step === 'confirming' && (
          <div className="py-10 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 rounded-full border-2 border-solana-purple border-t-transparent mx-auto mb-4"
            />
            <div className="text-sm text-text-primary font-medium mb-1">链上确认中</div>
            <div className="text-xs text-text-muted">正在等待网络确认...</div>
          </div>
        )}

        {/* 成功 */}
        {step === 'success' && (
          <div className="py-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-12 h-12 rounded-full bg-solana-green/15 flex items-center justify-center mx-auto mb-4"
            >
              <ArrowDownToLine className="w-6 h-6 text-solana-green" />
            </motion.div>
            <div className="text-sm text-text-primary font-medium mb-1">充值成功</div>
            <div className="text-xs text-solana-green mb-3">+{parseFloat(amount).toFixed(3)} SOL</div>
            {txSig && (
              <a
                href={devnetExplorer}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-solana-blue hover:underline"
              >
                查看交易 <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* 错误 */}
        {step === 'error' && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-status-error/15 flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-status-error" />
            </div>
            <div className="text-sm text-text-primary font-medium mb-1">交易失败</div>
            <div className="text-xs text-status-error mb-4">{errorMsg}</div>
            <button
              onClick={() => setStep('input')}
              className="px-4 py-2 rounded-lg text-xs text-text-primary bg-white/5 border border-border-default hover:bg-white/10 transition-colors cursor-pointer"
            >
              重试
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
