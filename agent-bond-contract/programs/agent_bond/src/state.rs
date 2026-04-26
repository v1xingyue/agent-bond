use borsh::{BorshDeserialize, BorshSerialize};

/// 全局配置账户（PDA: ["config", program_id]）
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Config {
    /// 管理员地址（32 bytes）
    pub admin: [u8; 32],
    /// 协议金库地址（32 bytes）
    pub treasury: [u8; 32],
    /// PDA bump
    pub bump: u8,
    /// 是否已初始化
    pub is_initialized: bool,
}

impl Config {
    pub const SEED_PREFIX: &[u8] = b"config";
    pub const LEN: usize = 32 + 32 + 1 + 1;
}

/// 用户全局状态（PDA: ["user_state", owner_pubkey]）
/// 保留用于统计，但余额逻辑已迁移到 AgentBond
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct UserState {
    /// 用户钱包地址（32 bytes）
    pub owner: [u8; 32],
    /// 总充值金额（lamports）
    pub total_deposited: u64,
    /// 总消费金额（lamports）
    pub total_spent: u64,
    /// 调用 Skill 总次数
    pub total_skills_executed: u32,
    /// PDA bump
    pub bump: u8,
    /// 是否已初始化
    pub is_initialized: bool,
}

impl UserState {
    pub const SEED_PREFIX: &[u8] = b"user_state";
    pub const LEN: usize = 32 + 8 + 8 + 4 + 1 + 1;
}

/// 用户与特定 Agent 的羁绊+余额状态（PDA: ["agent_bond", owner_pubkey, agent_id_bytes]）
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AgentBond {
    /// 用户钱包地址（32 bytes）
    pub owner: [u8; 32],
    /// Agent ID（最多 16 字节 UTF-8）
    pub agent_id: String,
    /// 对该 Agent 的总充值（lamports）
    pub total_deposited: u64,
    /// 羁绊值
    pub bond_value: u64,
    /// 对该 Agent 调用 Skill 的次数
    pub skill_count: u32,
    /// 对该 Agent 的总消费（lamports）
    pub total_spent: u64,
    /// PDA bump
    pub bump: u8,
    /// 是否已初始化
    pub is_initialized: bool,
}

impl AgentBond {
    pub const SEED_PREFIX: &[u8] = b"agent_bond";
    pub const MAX_AGENT_ID_LEN: usize = 16;

    pub fn len(agent_id: &str) -> usize {
        // 4 bytes string length prefix + string bytes + 32 + u64 + u64 + u32 + u64 + u8 + bool
        4 + agent_id.len() + 32 + 8 + 8 + 4 + 8 + 1 + 1
    }
}
