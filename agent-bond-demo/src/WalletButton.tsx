import { useWalletContext } from './WalletContext';
import { Wallet, LogOut, X } from 'lucide-react';
import { motion } from 'framer-motion';

export function WalletButton() {
  const { connected, publicKey, connect, disconnect, isModalOpen, setIsModalOpen, hasProvider } = useWalletContext();

  if (connected && publicKey) {
    const short = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-solana-green/10 border border-solana-green/20">
          <div className="w-2 h-2 rounded-full bg-solana-green animate-pulse" />
          <span className="text-xs font-mono text-solana-green">{short}</span>
        </div>
        <button
          onClick={disconnect}
          className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-status-error transition-colors cursor-pointer"
          title="断开连接"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-solana-purple to-solana-blue text-white text-xs font-medium shadow-lg shadow-solana-purple/20 hover:shadow-solana-purple/30 transition-shadow cursor-pointer"
      >
        <Wallet className="w-3.5 h-3.5" />
        连接钱包
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-start justify-center"
          style={{
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            paddingTop: '100px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            style={{ background: 'rgba(12, 12, 22, 0.95)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-text-primary mb-1">连接钱包</h3>
            <p className="text-xs text-text-muted mb-6">选择钱包以登录 Agent 羁绊协议</p>

            <div className="space-y-2">
              <button
                onClick={connect}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-border-default hover:border-border-hover hover:bg-white/[0.05] transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-text-primary">Phantom</div>
                  <div className="text-[10px] text-text-muted">
                    {hasProvider ? '已检测到' : '未安装，点击跳转'}
                  </div>
                </div>
              </button>

              <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-border-default/50 opacity-40 cursor-not-allowed">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-text-primary">Solflare</div>
                  <div className="text-[10px] text-text-muted">即将支持</div>
                </div>
              </div>

              <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-border-default/50 opacity-40 cursor-not-allowed">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="4"/>
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-text-primary">Backpack</div>
                  <div className="text-[10px] text-text-muted">即将支持</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
