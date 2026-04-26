import { create } from 'zustand';
import type { Agent, Transaction, ChatMessage } from './data';

interface AgentData {
  bondValue: number;
  balance: number;
  transactions: Transaction[];
  lastExecutionTime: Record<string, number>;
  unlockedPermissions: number[];
  chatMessages: ChatMessage[];
}

interface BondState {
  selectedAgent: Agent | null;
  agentsData: Record<string, AgentData>;
  isExecuting: boolean;
  showUnlockAnimation: boolean;
  lastUnlockedLevel: number;
  activeChatSkill: string | null;
  chatInput: string;
  chatHistory: ChatMessage[];
  isChatLoading: boolean;

  selectAgent: (agent: Agent) => void;
  resetCurrentAgent: () => void;
  executeSkill: (skillId: string, skillName: string, cost: number, bondGain: number, userInput: string, response: string) => void;
  deposit: (amount: number, txSignature?: string) => void;
  syncBalance: (balance: number) => void;
  syncBond: (bondValue: number) => void;
  dismissUnlockAnimation: () => void;
  openChat: (skillId: string) => void;
  closeChat: () => void;
  setChatInput: (input: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;

  getCurrentBond: () => number;
  getCurrentBalance: () => number;
  getCurrentTransactions: () => Transaction[];
  getCurrentLastExecutionTime: () => Record<string, number>;
  getCurrentUnlockedPermissions: () => number[];
  getCurrentChatMessages: () => ChatMessage[];
}

function generateSignature(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let sig = '';
  for (let i = 0; i < 43; i++) {
    sig += chars[Math.floor(Math.random() * chars.length)];
  }
  return sig;
}

function getDefaultAgentData(): AgentData {
  return {
    bondValue: 0,
    balance: 0,
    transactions: [],
    lastExecutionTime: {},
    unlockedPermissions: [1],
    chatMessages: [],
  };
}

export const useBondStore = create<BondState>((set, get) => ({
  selectedAgent: null,
  agentsData: {},
  isExecuting: false,
  showUnlockAnimation: false,
  lastUnlockedLevel: 1,
  activeChatSkill: null,
  chatInput: '',
  chatHistory: [],
  isChatLoading: false,

  selectAgent: (agent) => {
    const state = get();
    if (!state.agentsData[agent.id]) {
      set({
        selectedAgent: agent,
        agentsData: { ...state.agentsData, [agent.id]: getDefaultAgentData() },
        showUnlockAnimation: false,
        activeChatSkill: null,
      });
    } else {
      set({ selectedAgent: agent, showUnlockAnimation: false, activeChatSkill: null });
    }
  },

  resetCurrentAgent: () => {
    const state = get();
    if (!state.selectedAgent) return;
    const agentId = state.selectedAgent.id;
    set({
      agentsData: { ...state.agentsData, [agentId]: getDefaultAgentData() },
      showUnlockAnimation: false,
      activeChatSkill: null,
      chatHistory: [],
    });
  },

  deposit: (amount, txSignature?: string) => {
    const state = get();
    if (!state.selectedAgent || amount <= 0) return;
    const agentId = state.selectedAgent.id;
    const agentData = state.agentsData[agentId] || getDefaultAgentData();
    const now = Date.now();

    const tx: Transaction = {
      id: `tx_${now}`,
      type: 'bond_update',
      skillName: '充值',
      amount: -amount,
      bondDelta: 0,
      timestamp: new Date(),
      signature: txSignature || generateSignature(),
      status: 'confirmed',
    };

    const updated: AgentData = {
      ...agentData,
      balance: agentData.balance + amount,
      transactions: [tx, ...agentData.transactions].slice(0, 50),
    };

    set({
      agentsData: { ...state.agentsData, [agentId]: updated },
    });
  },

  executeSkill: (skillId, skillName, cost, bondGain, userInput, response) => {
    const state = get();
    if (!state.selectedAgent) return;

    const agentId = state.selectedAgent.id;
    const agentData = state.agentsData[agentId] || getDefaultAgentData();

    if (agentData.balance < cost) {
      console.warn('余额不足', { balance: agentData.balance, cost });
      return;
    }

    const now = Date.now();
    const lastTime = agentData.lastExecutionTime[skillId] || 0;
    const cooldown = 2000;
    if (now - lastTime < cooldown) return;

    set({ isExecuting: true });

    setTimeout(() => {
      const latestState = get();
      const latestAgentData = latestState.agentsData[agentId] || getDefaultAgentData();

      const newBond = latestAgentData.bondValue + bondGain;
      const newBalance = latestAgentData.balance - cost;
      const tx: Transaction = {
        id: `tx_${now}`,
        type: 'payment',
        skillName,
        amount: cost,
        bondDelta: bondGain,
        timestamp: new Date(),
        signature: generateSignature(),
        status: 'confirmed',
      };

      const userMsg: ChatMessage = {
        id: `msg_u_${now}`,
        role: 'user',
        content: userInput,
        timestamp: new Date(),
        skillId,
      };

      const agentMsg: ChatMessage = {
        id: `msg_a_${now}`,
        role: 'agent',
        content: response,
        timestamp: new Date(),
        skillId,
      };

      const systemMsg: ChatMessage = {
        id: `msg_s_${now}`,
        role: 'system',
        content: `💰 支付 ${cost.toFixed(3)} SOL · 羁绊 +${bondGain}`,
        timestamp: new Date(),
        skillId,
      };

      const oldLevel = latestAgentData.unlockedPermissions.length;
      const newPermissions: number[] = [];
      const thresholds = [0, 30, 50, 80, 100, 200];
      for (let i = 0; i < thresholds.length; i++) {
        if (newBond >= thresholds[i]) {
          newPermissions.push(i + 1);
        }
      }

      const newLevel = newPermissions.length;
      const unlockedNewLevel = newLevel > oldLevel ? newLevel : 0;

      const updatedAgentData: AgentData = {
        bondValue: newBond,
        balance: newBalance,
        transactions: [tx, ...latestAgentData.transactions].slice(0, 50),
        lastExecutionTime: { ...latestAgentData.lastExecutionTime, [skillId]: now },
        unlockedPermissions: newPermissions,
        chatMessages: [systemMsg, agentMsg, userMsg, ...latestAgentData.chatMessages].slice(0, 100),
      };

      set({
        agentsData: { ...latestState.agentsData, [agentId]: updatedAgentData },
        isExecuting: false,
        showUnlockAnimation: unlockedNewLevel > 0,
        lastUnlockedLevel: unlockedNewLevel,
        chatHistory: updatedAgentData.chatMessages,
        isChatLoading: false,
      });
    }, 1200);
  },

  syncBalance: (balance) => {
    const state = get();
    if (!state.selectedAgent) return;
    const agentId = state.selectedAgent.id;
    const agentData = state.agentsData[agentId] || getDefaultAgentData();
    set({
      agentsData: {
        ...state.agentsData,
        [agentId]: { ...agentData, balance },
      },
    });
  },

  syncBond: (bondValue) => {
    const state = get();
    if (!state.selectedAgent) return;
    const agentId = state.selectedAgent.id;
    const agentData = state.agentsData[agentId] || getDefaultAgentData();
    const thresholds = [0, 30, 50, 80, 100, 200];
    const newPermissions: number[] = [];
    for (let i = 0; i < thresholds.length; i++) {
      if (bondValue >= thresholds[i]) {
        newPermissions.push(i + 1);
      }
    }
    set({
      agentsData: {
        ...state.agentsData,
        [agentId]: { ...agentData, bondValue, unlockedPermissions: newPermissions },
      },
    });
  },

  dismissUnlockAnimation: () => {
    set({ showUnlockAnimation: false });
  },

  openChat: (skillId) => {
    const state = get();
    const agentId = state.selectedAgent?.id;
    const msgs = agentId ? state.agentsData[agentId]?.chatMessages || [] : [];
    set({ activeChatSkill: skillId, chatHistory: msgs, chatInput: '' });
  },

  closeChat: () => {
    set({ activeChatSkill: null, chatInput: '', isChatLoading: false });
  },

  setChatInput: (input) => set({ chatInput: input }),

  addChatMessage: (message) => {
    const state = get();
    const agentId = state.selectedAgent?.id;
    if (!agentId) return;
    const agentData = state.agentsData[agentId] || getDefaultAgentData();
    const updated = {
      ...agentData,
      chatMessages: [message, ...agentData.chatMessages].slice(0, 100),
    };
    set({
      agentsData: { ...state.agentsData, [agentId]: updated },
      chatHistory: updated.chatMessages,
    });
  },

  setChatLoading: (loading) => set({ isChatLoading: loading }),

  getCurrentBond: () => {
    const state = get();
    if (!state.selectedAgent) return 0;
    return state.agentsData[state.selectedAgent.id]?.bondValue || 0;
  },

  getCurrentBalance: () => {
    const state = get();
    if (!state.selectedAgent) return 0;
    return state.agentsData[state.selectedAgent.id]?.balance || 0;
  },

  getCurrentTransactions: () => {
    const state = get();
    if (!state.selectedAgent) return [];
    return state.agentsData[state.selectedAgent.id]?.transactions || [];
  },

  getCurrentLastExecutionTime: () => {
    const state = get();
    if (!state.selectedAgent) return {};
    return state.agentsData[state.selectedAgent.id]?.lastExecutionTime || {};
  },

  getCurrentUnlockedPermissions: () => {
    const state = get();
    if (!state.selectedAgent) return [1];
    return state.agentsData[state.selectedAgent.id]?.unlockedPermissions || [1];
  },

  getCurrentChatMessages: () => {
    const state = get();
    if (!state.selectedAgent) return [];
    return state.agentsData[state.selectedAgent.id]?.chatMessages || [];
  },
}));
