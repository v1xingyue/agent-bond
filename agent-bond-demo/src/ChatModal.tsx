import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Loader2, Bot, User, TrendingUp, BarChart3, Scan,
  RefreshCw, Target, ArrowLeftRight, Wallet
} from 'lucide-react';
import { AGENT_SKILLS } from './data';
import { useBondStore } from './store';
import { useAgentBondContract } from './contract/useContract';

const skillIconMap: Record<string, React.ElementType> = {
  TrendingUp, BarChart3, Scan, RefreshCw, Target, ArrowLeftRight,
};

function getSkillIcon(skillId: string, agentId?: string) {
  const skills = agentId ? (AGENT_SKILLS[agentId] || []) : [];
  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return Bot;
  return skillIconMap[skill.icon] || Bot;
}

function getSkillName(skillId: string, agentId?: string) {
  const skills = agentId ? (AGENT_SKILLS[agentId] || []) : [];
  return skills.find((s) => s.id === skillId)?.name || '';
}

function getSkillCost(skillId: string, agentId?: string) {
  const skills = agentId ? (AGENT_SKILLS[agentId] || []) : [];
  return skills.find((s) => s.id === skillId)?.cost || 0;
}

function getSkillBondGain(skillId: string, agentId?: string) {
  const skills = agentId ? (AGENT_SKILLS[agentId] || []) : [];
  return skills.find((s) => s.id === skillId)?.bondGain || 0;
}

function getPlaceholder(skillId: string, agentId?: string) {
  const skills = agentId ? (AGENT_SKILLS[agentId] || []) : [];
  return skills.find((s) => s.id === skillId)?.promptPlaceholder || '请输入...';
}

function getMockResponse(skillId: string, input: string, agentId?: string) {
  const skills = agentId ? (AGENT_SKILLS[agentId] || []) : [];
  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return '处理完成。';
  return skill.mockResponse(input);
}

export function ChatModal() {
  const store = useBondStore();
  const contract = useAgentBondContract();
  const skillId = store.activeChatSkill;
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<
    { role: 'user' | 'agent' | 'system' | 'thinking' | 'paying'; content: string; id: string }[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agentId = store.selectedAgent?.id;
  const skillName = getSkillName(skillId || '', agentId);
  const SkillIcon = getSkillIcon(skillId || '', agentId);
  const cost = getSkillCost(skillId || '', agentId);
  const bondGain = getSkillBondGain(skillId || '', agentId);
  const placeholder = getPlaceholder(skillId || '', agentId);

  // Sync with store chat history when opening
  useEffect(() => {
    if (skillId) {
      const stored = store.getCurrentChatMessages().filter((m) => m.skillId === skillId);
      const mapped = stored.map((m) => ({
        role: m.role as 'user' | 'agent' | 'system',
        content: m.content,
        id: m.id,
      }));
      setLocalMessages(mapped);
      setInput('');
    }
  }, [skillId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  if (!skillId) return null;

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userContent = input.trim();
    const currentBalance = store.getCurrentBalance();

    // 余额不足检查
    if (currentBalance < cost) {
      const errMsg = { role: 'system' as const, content: `❌ 余额不足 · 需要 ${cost.toFixed(3)} SOL · 当前 ${currentBalance.toFixed(3)} SOL`, id: `err_${Date.now()}` };
      setLocalMessages((prev) => [errMsg, ...prev]);
      return;
    }

    setInput('');
    setIsProcessing(true);

    // Add user message
    const userMsg = { role: 'user' as const, content: userContent, id: `u_${Date.now()}` };
    setLocalMessages((prev) => [userMsg, ...prev]);

    // Simulate paying
    const payMsg = { role: 'paying' as const, content: `x402 支付 ${cost.toFixed(3)} SOL...`, id: `p_${Date.now()}` };
    setLocalMessages((prev) => [payMsg, ...prev]);

    try {
      // 调用合约 ExecuteSkill（链上扣费 + 增加羁绊）
      const signature = await contract.executeSkill(
        agentId || '',
        skillId || '',
        cost,
        bondGain
      );

      // Remove paying, add thinking
      setLocalMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== payMsg.id);
        return [{ role: 'thinking', content: `${skillName} 处理中...`, id: `t_${Date.now()}` }, ...filtered];
      });

      // 链上已确认，开始工作流模拟
      const response = getMockResponse(skillId, userContent, agentId);
      const streamId = `stream_${Date.now()}`;

      // 先插入空的 agent message + system msg
      setLocalMessages((prev) => {
        const filtered = prev.filter((m) => m.role !== 'thinking');
        const sysMsg = { role: 'system' as const, content: `💰 支付 ${cost.toFixed(3)} SOL · 羁绊 +${bondGain} · 签名 ${signature?.slice(0, 8)}...`, id: `s_${Date.now()}` };
        const agentMsg = { role: 'agent' as const, content: '', id: streamId };
        return [sysMsg, agentMsg, ...filtered];
      });

      // 动态流式输出
      await streamAgentResponse(agentId || '', skillName, response, streamId, setLocalMessages);

      // 更新本地 store（用最终完整内容）
      store.executeSkill(skillId, skillName, cost, bondGain, userContent, response);

      // 刷新链上 AgentBond 羁绊值并同步
      if (agentId) {
        const bondData = await contract.fetchOnChainBond(agentId);
        if (bondData) {
          const onChainBond = Number(bondData.bondValue);
          store.syncBond(onChainBond);
          console.log('[ChatModal] Bond synced from chain:', onChainBond);
        }
      }

      // 刷新链上余额并同步到本地
      const userState = await contract.fetchOnChainState();
      if (userState) {
        const available = Number(userState.totalDeposited - userState.totalSpent) / 1e9;
        store.syncBalance(available);
      }
    } catch (err: any) {
      console.error('ExecuteSkill failed', err);
      setLocalMessages((prev) => {
        const filtered = prev.filter((m) => m.role === 'user');
        const errMsg = { role: 'system' as const, content: `❌ 链上调用失败: ${err?.message || '未知错误'}`, id: `err_${Date.now()}` };
        return [errMsg, ...filtered];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {skillId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'var(--overlay-bg)' }}
          onClick={() => store.closeChat()}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md glass-card border-l border-border-default overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-subtle-faint">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-solana-purple/10 flex items-center justify-center">
                  <SkillIcon className="w-4.5 h-4.5 text-solana-purple" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{skillName}</div>
                  <div className="text-[10px] text-text-muted flex items-center gap-2">
                    <span>{cost.toFixed(3)} SOL</span>
                    <span className="text-solana-green">+{bondGain} 羁绊</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => store.closeChat()}
                className="w-8 h-8 rounded-lg hover:bg-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide flex flex-col-reverse"
            >
              {localMessages.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                  <Bot className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>输入内容开始与 Agent 交互</p>
                  <p className="text-xs mt-1 opacity-50">每次调用通过 x402 自动完成微支付</p>
                </div>
              )}

              {localMessages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border-default bg-subtle-faint">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={1}
                  className="flex-1 bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted/50 resize-none focus:outline-none focus:border-solana-purple/40 transition-colors min-h-[40px] max-h-[120px]"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isProcessing}
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-solana-purple to-solana-blue flex items-center justify-center text-white shrink-0 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({
  msg,
}: {
  msg: { role: string; content: string; id: string };
}) {
  if (msg.role === 'thinking') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-text-muted text-xs"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-solana-purple" />
        <span>{msg.content}</span>
      </motion.div>
    );
  }

  if (msg.role === 'paying') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-text-muted text-xs"
      >
        <Wallet className="w-3.5 h-3.5 text-bond-orange" />
        <span>{msg.content}</span>
      </motion.div>
    );
  }

  if (msg.role === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center"
      >
        <span className="text-[10px] px-3 py-1 rounded-full bg-subtle text-text-muted border border-subtle-faint">
          {msg.content}
        </span>
      </motion.div>
    );
  }

  const isUser = msg.role === 'user';
  const isStreaming = !isUser && msg.content.endsWith('▌');
  const displayContent = isStreaming ? msg.content.slice(0, -1) : msg.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? 'bg-solana-blue/15 text-solana-blue' : 'bg-solana-purple/15 text-solana-purple'
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-solana-blue/10 text-text-primary rounded-tr-sm'
            : 'bg-subtle text-text-secondary rounded-tl-sm border border-subtle-faint'
        }`}
      >
        {displayContent}
        {isStreaming && (
          <span className="inline-block w-[2px] h-4 bg-solana-purple animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </motion.div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 模拟 Agent 工作流流式输出 */
async function streamAgentResponse(
  agentId: string,
  _skillName: string,
  fullResponse: string,
  msgId: string,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>
) {
  // 按 Agent 定制工作流步骤
  const getWorkflowSteps = (id: string): string[] => {
    switch (id) {
      case 'alpha':
        return [
          '🔌 建立链上数据连接...',
          '📡 订阅 Jupiter 实时报价流...',
          '📊 分析订单簿深度与滑点...',
          '🧮 计算最优执行路径...',
          '✅ 生成交易信号报告\n',
        ];
      case 'beta':
        return [
          '🔍 初始化链上扫描引擎...',
          '📡 抓取社交媒体情绪数据...',
          '🧠 运行 NLP 情感分析模型...',
          '📈 交叉验证链上资金流...',
          '✅ 输出调研洞察\n',
        ];
      case 'gamma':
        return [
          '🛡️ 启动安全审计沙箱...',
          '🔐 扫描合约权限结构...',
          '⚠️ 匹配已知漏洞数据库...',
          '📋 评估授权风险矩阵...',
          '✅ 输出安全诊断\n',
        ];
      default:
        return ['⚙️ 处理中...', '✅ 完成\n'];
    }
  };

  const steps = getWorkflowSteps(agentId);
  let accumulated = '';

  // Step 1: 工作流步骤（带 emoji + 光标）
  for (const step of steps) {
    accumulated += step + '\n';
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: accumulated + '▌' } : m)));
    await delay(600 + Math.random() * 400);
  }

  // Step 2: 正文按段落逐步输出（带光标）
  const paragraphs = fullResponse.split('\n\n');
  for (const para of paragraphs) {
    accumulated += para + '\n\n';
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: accumulated + '▌' } : m)));
    await delay(250 + Math.random() * 200);
  }

  // 完成：移除光标
  setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: accumulated.trimEnd() } : m)));
}
