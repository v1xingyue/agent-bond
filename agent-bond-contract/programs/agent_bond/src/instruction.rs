use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum AgentBondInstruction {
    /// 初始化协议配置
    /// 
    /// Accounts expected:
    /// 0. `[signer, writable]` Payer / Admin
    /// 1. `[writable]` Config PDA (["config", program_id])
    /// 2. `[]` System program
    Initialize {
        /// 协议金库地址
        treasury: [u8; 32],
    },

    /// 用户充值 SOL 到协议
    /// 
    /// Accounts expected:
    /// 0. `[signer, writable]` User (payer)
    /// 1. `[writable]` Config PDA
    /// 2. `[writable]` UserState PDA (["user_state", user_pubkey])
    /// 3. `[writable]` Treasury account
    /// 4. `[]` System program
    Deposit {
        /// 充值金额（lamports）
        amount: u64,
    },

    /// 调用 Skill（消费 + 增加羁绊）
    /// 
    /// Accounts expected:
    /// 0. `[signer, writable]` User (payer)
    /// 1. `[writable]` Config PDA
    /// 2. `[writable]` UserState PDA
    /// 3. `[writable]` AgentBond PDA (["agent_bond", user_pubkey, agent_id])
    /// 4. `[writable]` Treasury account
    /// 5. `[]` System program
    ExecuteSkill {
        /// Agent ID（如 "alpha", "beta", "gamma"）
        agent_id: String,
        /// Skill ID
        skill_id: String,
        /// 消费金额（lamports）
        cost: u64,
        /// 获得的羁绊值
        bond_gain: u64,
    },

    /// 用户提款（仅退回自己在 UserState 中记录的余额部分）
    /// 
    /// Accounts expected:
    /// 0. `[signer]` User
    /// 1. `[writable]` Config PDA
    /// 2. `[writable]` UserState PDA
    /// 3. `[writable]` Treasury account (协议金库，需要是 PDA 或受控账户)
    /// 4. `[writable]` User wallet
    /// 5. `[]` System program
    Withdraw {
        /// 提款金额（lamports）
        amount: u64,
    },
}
