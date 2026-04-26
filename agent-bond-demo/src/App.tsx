import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, TrendingUp, BarChart3, Scan, RefreshCw, Target,
  ArrowLeftRight, Search, Eye, Zap, Shield, Lock, Unlock,
  CheckCircle2, X, Activity, Coins, Crown,
  ChevronRight, RotateCcw, MessageSquare, Wallet, Plus, Droplets
} from 'lucide-react';

import { AGENTS, AGENT_SKILLS, PERMISSIONS, getBondLevel, getLevelProgress } from './data';
import { useBondStore } from './store';
import { ChatModal } from './ChatModal';
import { DepositModal } from './DepositModal';
import { WalletButton } from './WalletButton';
import { useWalletContext } from './WalletContext';
import { useAgentBondContract } from './contract/useContract';
import { Connection, PublicKey } from '@solana/web3.js';
import type { Skill } from './data';
import LandingPage, { useHashRoute } from './LandingPage';

const iconMap: Record<string, React.ElementType> = {
  TrendingUp, BarChart3, Scan, RefreshCw, Target, ArrowLeftRight,
  Search, Eye, Zap, Shield, Crown,
};

function getCategoryColor(cat: Skill['category']) {
  switch (cat) {
    case 'data': return 'text-solana-blue bg-solana-blue/10 border-solana-blue/20';
    case 'analysis': return 'text-solana-purple bg-solana-purple/10 border-solana-purple/20';
    case 'execution': return 'text-bond-orange bg-bond-orange/10 border-bond-orange/20';
    case 'creative': return 'text-solana-green bg-solana-green/10 border-solana-green/20';
  }
}

function getCategoryLabel(cat: Skill['category']) {
  switch (cat) {
    case 'data': return '数据';
    case 'analysis': return '分析';
    case 'execution': return '执行';
    case 'creative': return '创作';
  }
}

function AppDemo() {
  const store = useBondStore();

  useEffect(() => {
    if (store.showUnlockAnimation) {
      const t = setTimeout(() => store.dismissUnlockAnimation(), 3500);
      return () => clearTimeout(t);
    }
  }, [store.showUnlockAnimation]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 px-6 py-4 border-b border-border-default bg-bg-secondary/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-solana-green animate-pulse" />
            <span className="text-sm font-medium text-text-primary">Agent 羁绊协议</span>
            <span className="text-xs text-text-muted hidden sm:inline">· 链上信任层 MVP 演示</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => store.resetCurrentAgent()}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置当前 Agent
            </button>
            <WalletButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <DemoContent />
      </div>

      {/* Chat Modal */}
      <ChatModal />

      {/* Unlock Overlay */}
      <AnimatePresence>
        {store.showUnlockAnimation && (
          <UnlockOverlay level={store.lastUnlockedLevel} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const hash = useHashRoute();
  if (hash === '#/demo') {
    return <AppDemo />;
  }
  return <LandingPage />;
}

function useCurrentAgentData() {
  const store = useBondStore();
  const selected = store.selectedAgent;
  if (!selected) {
    return { bond: 0, balance: 0, txs: [], lastExec: {}, perms: [1], chatMsgs: [] };
  }
  const data = store.agentsData[selected.id];
  return {
    bond: data?.bondValue || 0,
    balance: data?.balance || 0,
    txs: data?.transactions || [],
    lastExec: data?.lastExecutionTime || {},
    perms: data?.unlockedPermissions || [1],
    chatMsgs: data?.chatMessages || [],
  };
}

function DemoContent() {
  const [activeTab, setActiveTab] = useState<'skills' | 'permissions'>('skills');
  const [depositOpen, setDepositOpen] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const store = useBondStore();
  const { connected, requestAirdrop, publicKey } = useWalletContext();
  const contract = useAgentBondContract();
  const selected = store.selectedAgent;
  const { bond, balance: localBalance } = useCurrentAgentData();
  const level = getBondLevel(bond);
  const progress = getLevelProgress(bond);

  // 链上余额
  const [onChainBalance, setOnChainBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // 链上原始数据
  const [userStateData, setUserStateData] = useState<any>(null);
  const [agentBondData, setAgentBondData] = useState<any>(null);
  const [chainTxs, setChainTxs] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const refreshOnChainBalance = async () => {
    if (!publicKey) return;
    setBalanceLoading(true);
    try {
      const state = await contract.fetchOnChainState();
      setUserStateData(state);
      if (state) {
        const available = Number(state.totalDeposited - state.totalSpent) / 1e9;
        setOnChainBalance(available);
        store.syncBalance(available);
      } else {
        setOnChainBalance(0);
        store.syncBalance(0);
      }
    } catch (e) {
      console.error('Fetch on-chain balance failed', e);
    }
    setBalanceLoading(false);
  };

  const refreshOnChainBond = async (agentId: string) => {
    if (!publicKey || !agentId) return;
    try {
      const bondData = await contract.fetchOnChainBond(agentId);
      if (bondData) {
        const onChainBond = Number(bondData.bondValue);
        store.syncBond(onChainBond);
        setAgentBondData(bondData);
        console.log('[App] Bond synced from chain:', onChainBond);
      } else {
        store.syncBond(0);
        setAgentBondData(null);
      }
    } catch (e) {
      console.error('Fetch on-chain bond failed', e);
    }
  };

  const refreshAllChainData = async (agentId?: string) => {
    const targetAgentId = agentId || selected?.id;
    if (!publicKey || !targetAgentId) return;
    setDataLoading(true);
    await refreshOnChainBalance();
    await refreshOnChainBond(targetAgentId);

    // 获取链上最近交易
    try {
      const connection = new Connection('https://api.devnet.solana.com');
      const sigs = await connection.getSignaturesForAddress(new PublicKey(publicKey), { limit: 10 });
      setChainTxs(sigs.map(s => ({
        signature: s.signature,
        slot: s.slot,
        time: s.blockTime ? new Date(s.blockTime * 1000).toLocaleString() : '-',
        status: s.err ? '失败' : '成功',
      })));
    } catch (e) {
      console.error('Fetch chain txs failed', e);
    }
    setDataLoading(false);
  };

  // 页面加载/切换Agent/充值后刷新链上余额和羁绊
  useEffect(() => {
    if (publicKey && selected) {
      refreshAllChainData(selected.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, selected?.id]);

  const handleFaucet = async () => {
    if (!connected || faucetLoading) return;
    setFaucetLoading(true);
    try {
      await requestAirdrop();
      // 自动充值到当前 Agent 余额（模拟 faucet 到账后直接充入）
      store.deposit(1);
    } catch (err) {
      console.error('Faucet failed', err);
    }
    setFaucetLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Agent Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AGENTS.map((agent) => (
          <motion.button
            key={agent.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              store.selectAgent(agent);
              refreshAllChainData(agent.id);
            }}
            className={`relative p-5 rounded-2xl text-left transition-all duration-300 cursor-pointer ${
              selected?.id === agent.id
                ? 'glass-card border-solana-purple/40 glow-purple'
                : 'glass-card glass-card-hover border-border-default'
            }`}
          >
            {selected?.id === agent.id && (
              <motion.div
                layoutId="agent-indicator"
                className="absolute inset-0 rounded-2xl border-2 border-solana-purple/50"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className="relative z-10 flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.avatar}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-text-primary truncate">{agent.name}</div>
                <div className="text-xs text-text-muted mb-1">{agent.role}</div>
                <div className="text-xs font-mono text-text-secondary truncate">{agent.address}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left: Bond Panel */}
          <div className="lg:col-span-4 space-y-6">
            <BondPanel bond={bond} balance={localBalance} onChainBalance={onChainBalance} level={level} progress={progress} agentColor={selected.color} onDeposit={() => setDepositOpen(true)} onFaucet={handleFaucet} faucetLoading={faucetLoading} onRefreshBalance={refreshAllChainData} balanceLoading={balanceLoading} />
            <ChainDataPanel userState={userStateData} agentBond={agentBondData} chainTxs={chainTxs} loading={dataLoading} />
            <TransactionMiniList />
          </div>

          {/* Right: Skills / Permissions */}
          <div className="lg:col-span-8">
            <div className="glass-card rounded-2xl p-1">
              <div className="flex gap-1 p-1 mb-4">
                {(['skills', 'permissions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'bg-white/10 text-text-primary'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {tab === 'skills' ? 'Agent 控制台' : '权限层级'}
                  </button>
                ))}
              </div>

              <div className="px-4 pb-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'skills' ? (
                    <SkillsPanel key="skills" balance={localBalance} />
                  ) : (
                    <PermissionsPanel key="perms" bond={bond} />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!selected && (
        <div className="text-center py-20 glass-card rounded-2xl">
          <Bot className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">请从上方选择一个 Agent 开始体验</p>
        </div>
      )}

      {/* Deposit Modal */}
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} onSuccess={refreshAllChainData} />
    </div>
  );
}

function BondPanel({ bond, balance, onChainBalance, level, progress, agentColor, onDeposit, onFaucet, faucetLoading, onRefreshBalance, balanceLoading }: {
  bond: number; balance: number; onChainBalance: number | null; level: number; progress: { current: number; next: number; progress: number }; agentColor: string; onDeposit: () => void; onFaucet: () => void; faucetLoading: boolean; onRefreshBalance: () => void; balanceLoading: boolean;
}) {
  const { txs } = useCurrentAgentData();
  const recentTx = txs.slice(0, 3);
  const totalPay = txs.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="glass-card rounded-2xl p-6 glow-purple">
      {/* Balance Row */}
      <div className="flex items-center justify-between mb-5 pb-5 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-solana-blue/20 to-solana-purple/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-solana-blue" />
          </div>
          <div>
            <div className="text-sm text-text-muted">链上余额</div>
            <div className="flex items-center gap-2">
              <div className="text-xl font-bold text-text-primary">
                {onChainBalance !== null ? onChainBalance.toFixed(3) : '--'} <span className="text-sm font-normal text-text-muted">SOL</span>
              </div>
              <button
                onClick={onRefreshBalance}
                disabled={balanceLoading}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                title="刷新链上余额"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {onChainBalance !== null && onChainBalance !== balance && (
              <div className="text-[10px] text-text-muted">
                本地记录: {balance.toFixed(3)} SOL
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onFaucet}
            disabled={faucetLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-solana-green bg-solana-green/10 border border-solana-green/20 hover:bg-solana-green/15 transition-colors cursor-pointer disabled:opacity-50"
            title="从 Devnet Faucet 领取 1 SOL"
          >
            <Droplets className={`w-3.5 h-3.5 ${faucetLoading ? 'animate-bounce' : ''}`} />
            {faucetLoading ? '领取中' : '领水'}
          </button>
          <button
            onClick={onDeposit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-solana-purple bg-solana-purple/10 border border-solana-purple/20 hover:bg-solana-purple/15 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            充值
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-solana-purple" />
          </div>
          <div>
            <div className="text-sm text-text-muted">当前羁绊值</div>
            <div className="text-2xl font-bold gradient-text-orange">{bond.toLocaleString()}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted">等级</div>
          <div className="text-xl font-bold" style={{ color: agentColor }}>Lv.{level}</div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-text-muted mb-2">
          <span>Lv.{level}</span>
          <span>{progress.next === 300 ? 'MAX' : `Lv.${level + 1}`}</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${agentColor}, #14F195)` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 1 }}
          />
        </div>
        <div className="text-xs text-text-muted mt-1 text-right">
          {bond.toLocaleString()} / {progress.next.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="bg-white/[0.03] rounded-xl p-3">
          <div className="text-xs text-text-muted mb-1">总支付</div>
          <div className="text-sm font-mono text-text-primary">{totalPay.toFixed(3)} SOL</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3">
          <div className="text-xs text-text-muted mb-1">调用次数</div>
          <div className="text-sm font-mono text-text-primary">{txs.filter(t => t.type === 'payment').length} 次</div>
        </div>
      </div>

      {recentTx.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-default">
          <div className="text-xs text-text-muted mb-2">最近活动</div>
          <div className="space-y-2">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-solana-green" />
                  <span className="text-text-secondary truncate max-w-[120px]">{tx.skillName}</span>
                </div>
                <span className="text-solana-green font-mono">+{tx.bondDelta}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionMiniList() {
  const { txs } = useCurrentAgentData();
  if (txs.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5 max-h-[320px] overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Coins className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-medium text-text-secondary">链上记录</span>
      </div>
      <div className="space-y-2 overflow-y-auto scrollbar-hide flex-1">
        {txs.slice(0, 8).map((tx) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] text-xs"
          >
            <div className="min-w-0 flex-1">
              <div className="text-text-secondary truncate">{tx.skillName}</div>
              <div className="text-text-muted font-mono truncate">{tx.signature.slice(0, 16)}...</div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className={tx.type === 'bond_update' ? 'text-solana-blue' : 'text-text-muted'}>
                {tx.type === 'bond_update' ? `+${Math.abs(tx.amount).toFixed(3)}` : tx.amount.toFixed(3)} SOL
              </div>
              <div className="text-solana-green">+{tx.bondDelta}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SkillsPanel({ balance }: { balance: number }) {
  const store = useBondStore();
  const [flashSkills, setFlashSkills] = useState<Set<string>>(new Set());
  const { bond } = useCurrentAgentData();
  const currentLevel = getBondLevel(bond);
  const prevLevelRef = useRef(currentLevel);

  // 获取当前 Agent 的专属 Skill
  const agentSkills = store.selectedAgent
    ? (AGENT_SKILLS[store.selectedAgent.id] || [])
    : [];

  useEffect(() => {
    if (currentLevel > prevLevelRef.current) {
      const newlyUnlocked = agentSkills.filter(
        (s) => s.minPermissionLevel > prevLevelRef.current && s.minPermissionLevel <= currentLevel
      ).map((s) => s.id);
      if (newlyUnlocked.length > 0) {
        setFlashSkills(new Set(newlyUnlocked));
        const t = setTimeout(() => setFlashSkills(new Set()), 4000);
        return () => clearTimeout(t);
      }
    }
    prevLevelRef.current = currentLevel;
  }, [currentLevel, agentSkills]);

  const handleOpenChat = (skillId: string) => {
    store.openChat(skillId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {agentSkills.map((skill) => {
        const Icon = iconMap[skill.icon] || Bot;
        const unlocked = currentLevel >= skill.minPermissionLevel;
        const canAfford = balance >= skill.cost;
        const isFlashing = flashSkills.has(skill.id);

        return (
          <motion.button
            key={skill.id}
            whileHover={unlocked && canAfford ? { scale: 1.01 } : {}}
            whileTap={unlocked && canAfford ? { scale: 0.98 } : {}}
            onClick={() => unlocked && canAfford && handleOpenChat(skill.id)}
            disabled={!unlocked || !canAfford}
            className={`relative p-4 rounded-xl text-left transition-all disabled:cursor-not-allowed group overflow-hidden ${
              unlocked && canAfford
                ? 'bg-white/[0.02] border border-border-default hover:border-border-hover cursor-pointer'
                : 'bg-white/[0.01] border border-border-default/40 opacity-50'
            } ${isFlashing ? 'ring-2 ring-solana-green/60' : ''}`}
          >
            {isFlashing && (
              <motion.div
                initial={{ opacity: 0.6 }}
                animate={{ opacity: [0.6, 0, 0.6, 0] }}
                transition={{ duration: 2, repeat: 1 }}
                className="absolute inset-0 bg-solana-green/10 pointer-events-none z-0"
              />
            )}

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  unlocked && canAfford ? getCategoryColor(skill.category) : 'text-text-muted bg-white/5 border-white/5'
                }`}>
                  {!unlocked ? (
                    <Lock className="w-4 h-4 text-text-muted" />
                  ) : !canAfford ? (
                    <Zap className="w-4 h-4 text-status-error" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-right">
                  {unlocked && canAfford ? (
                    <>
                      <div className="text-xs text-text-muted">{skill.cost.toFixed(3)} SOL</div>
                      <div className="text-xs text-solana-green">+{skill.bondGain} 羁绊</div>
                    </>
                  ) : !unlocked ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-muted border border-white/5">
                      Lv.{skill.minPermissionLevel} 解锁
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-error/10 text-status-error border border-status-error/20">
                      余额不足
                    </span>
                  )}
                </div>
              </div>
              <div className={`font-medium text-sm mb-1 ${unlocked && canAfford ? 'text-text-primary' : 'text-text-muted'}`}>
                {skill.name}
              </div>
              <div className="text-xs text-text-muted leading-relaxed">{skill.description}</div>
              {unlocked && canAfford && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getCategoryColor(skill.category)}`}>
                    {getCategoryLabel(skill.category)}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-solana-purple">
                    <MessageSquare className="w-3 h-3" />
                    点击交互
                  </span>
                </div>
              )}
            </div>

            {unlocked && canAfford && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-solana-purple/5 to-solana-green/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

function PermissionsPanel({ bond }: { bond: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {PERMISSIONS.map((perm, i) => {
        const unlocked = bond >= perm.minBond;
        const isNext = !unlocked && (i === 0 || bond >= PERMISSIONS[i - 1].minBond);

        return (
          <motion.div
            key={perm.level}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              unlocked
                ? 'bg-solana-green/5 border-solana-green/20'
                : isNext
                ? 'bg-white/[0.02] border-bond-orange/20'
                : 'bg-white/[0.02] border-border-default opacity-50'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              unlocked ? 'bg-solana-green/10 text-solana-green' : 'bg-white/5 text-text-muted'
            }`}>
              {unlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{perm.name}</span>
                {unlocked && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-solana-green/10 text-solana-green font-medium">
                    已解锁
                  </span>
                )}
                {isNext && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bond-orange/10 text-bond-orange font-medium">
                    下一级
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted mt-0.5">{perm.description}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-mono text-text-muted">≥ {perm.minBond}</div>
              <div className="text-[10px] text-text-muted">羁绊值</div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function ChainDataPanel({ userState, agentBond, chainTxs, loading }: {
  userState: any;
  agentBond: any;
  chainTxs: any[];
  loading: boolean;
}) {
  if (!userState && !agentBond && chainTxs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-solana-blue" />
          <span className="text-sm font-medium text-text-secondary">链上数据</span>
          {loading && <RefreshCw className="w-3 h-3 animate-spin text-text-muted ml-auto" />}
        </div>
        <p className="text-xs text-text-muted text-center py-4">暂无链上数据</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 max-h-[400px] overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-solana-blue" />
        <span className="text-sm font-medium text-text-secondary">链上数据</span>
        {loading && <RefreshCw className="w-3 h-3 animate-spin text-text-muted ml-auto" />}
      </div>

      <div className="space-y-3 overflow-y-auto scrollbar-hide flex-1">
        {/* UserState */}
        {userState && (
          <div className="p-3 rounded-lg bg-white/[0.02] border border-border-default">
            <div className="text-[10px] text-solana-blue font-medium mb-2 uppercase tracking-wider">UserState PDA</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-text-muted">总充值</div>
                <div className="font-mono text-text-primary">{(Number(userState.totalDeposited) / 1e9).toFixed(3)} SOL</div>
              </div>
              <div>
                <div className="text-text-muted">总消费</div>
                <div className="font-mono text-text-primary">{(Number(userState.totalSpent) / 1e9).toFixed(3)} SOL</div>
              </div>
              <div>
                <div className="text-text-muted">可用余额</div>
                <div className="font-mono text-solana-green">{((Number(userState.totalDeposited) - Number(userState.totalSpent)) / 1e9).toFixed(3)} SOL</div>
              </div>
              <div>
                <div className="text-text-muted">调用次数</div>
                <div className="font-mono text-text-primary">{userState.totalSkillsExecuted} 次</div>
              </div>
            </div>
          </div>
        )}

        {/* AgentBond */}
        {agentBond && (
          <div className="p-3 rounded-lg bg-white/[0.02] border border-border-default">
            <div className="text-[10px] text-solana-purple font-medium mb-2 uppercase tracking-wider">AgentBond PDA ({agentBond.agentId})</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-text-muted">羁绊值</div>
                <div className="font-mono text-text-primary">{Number(agentBond.bondValue).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-text-muted">Skill 调用</div>
                <div className="font-mono text-text-primary">{agentBond.skillCount} 次</div>
              </div>
              <div>
                <div className="text-text-muted">总消费</div>
                <div className="font-mono text-text-primary">{(Number(agentBond.totalSpent) / 1e9).toFixed(3)} SOL</div>
              </div>
              <div>
                <div className="text-text-muted">已初始化</div>
                <div className="font-mono text-solana-green">{agentBond.isInitialized ? '是' : '否'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Chain Transactions */}
        {chainTxs.length > 0 && (
          <div>
            <div className="text-[10px] text-text-muted font-medium mb-2 uppercase tracking-wider">最近链上交易</div>
            <div className="space-y-1.5">
              {chainTxs.slice(0, 5).map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-white/[0.02] text-[10px]">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-solana-blue hover:underline truncate block"
                      title={tx.signature}
                    >
                      {tx.signature.slice(0, 16)}...
                    </a>
                    <div className="text-text-muted">{tx.time}</div>
                  </div>
                  <div className={`shrink-0 ml-2 ${tx.status === '成功' ? 'text-solana-green' : 'text-status-error'}`}>
                    {tx.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UnlockOverlay({ level }: { level: number }) {
  const perm = PERMISSIONS.find((p) => p.level === level);
  if (!perm) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={() => useBondStore.getState().dismissUnlockAnimation()}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.3 }}
        className="relative glass-card rounded-3xl p-10 text-center max-w-sm mx-4 glow-green"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => useBondStore.getState().dismissUnlockAnimation()}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-solana-green/20 to-solana-blue/20 flex items-center justify-center mx-auto mb-6"
        >
          <Crown className="w-10 h-10 text-solana-green" />
        </motion.div>

        <div className="text-sm text-solana-green font-medium mb-2">权限升级</div>
        <h3 className="text-2xl font-bold text-text-primary mb-2">{perm.name}</h3>
        <p className="text-text-secondary text-sm mb-6">{perm.description}</p>

        <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
          <span>Lv.{level - 1}</span>
          <ChevronRight className="w-4 h-4 text-solana-green" />
          <span className="text-solana-green font-medium">Lv.{level}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
