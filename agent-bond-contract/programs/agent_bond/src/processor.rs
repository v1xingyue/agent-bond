use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

use crate::{
    error::AgentBondError,
    instruction::AgentBondInstruction,
    state::{AgentBond, Config, UserState},
};

pub struct Processor;
impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = AgentBondInstruction::try_from_slice(instruction_data)
            .map_err(|_| AgentBondError::InvalidInstruction)?;

        match instruction {
            AgentBondInstruction::Initialize { treasury } => {
                msg!("Instruction: Initialize");
                Self::process_initialize(program_id, accounts, treasury)
            }
            AgentBondInstruction::Deposit { amount } => {
                msg!("Instruction: Deposit");
                Self::process_deposit(program_id, accounts, amount)
            }
            AgentBondInstruction::ExecuteSkill {
                agent_id,
                skill_id: _,
                cost,
                bond_gain,
            } => {
                msg!("Instruction: ExecuteSkill");
                Self::process_execute_skill(program_id, accounts, agent_id, cost, bond_gain)
            }
            AgentBondInstruction::Withdraw { amount } => {
                msg!("Instruction: Withdraw");
                Self::process_withdraw(program_id, accounts, amount)
            }
        }
    }

    /// 初始化协议配置
    fn process_initialize(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        treasury: [u8; 32],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let payer = next_account_info(account_info_iter)?;
        let config_account = next_account_info(account_info_iter)?;
        let system_program = next_account_info(account_info_iter)?;

        if !payer.is_signer {
            return Err(AgentBondError::Unauthorized.into());
        }

        let (config_pda, config_bump) =
            Pubkey::find_program_address(&[Config::SEED_PREFIX], program_id);

        if config_pda != *config_account.key {
            return Err(AgentBondError::InvalidInstruction.into());
        }

        let rent = Rent::get()?;
        let space = Config::LEN;
        let lamports = rent.minimum_balance(space);

        msg!("Before create_account: lamports={}, data_len={}", config_account.lamports(), config_account.data_len());

        invoke_signed(
            &system_instruction::create_account(
                payer.key,
                config_account.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[payer.clone(), config_account.clone(), system_program.clone()],
            &[&[Config::SEED_PREFIX, &[config_bump]]],
        )?;

        msg!("After create_account: lamports={}, data_len={}", config_account.lamports(), config_account.data_len());

        let mut config = Config::try_from_slice(&config_account.data.borrow())?;
        if config.is_initialized {
            return Err(AgentBondError::AlreadyInitialized.into());
        }

        config.admin = payer.key.to_bytes();
        config.treasury = treasury;
        config.bump = config_bump;
        config.is_initialized = true;

        config.serialize(&mut *config_account.data.borrow_mut())?;

        msg!("Config data len: {}", config_account.data_len());
        msg!("Config initialized. Treasury: {:?}", config.treasury);
        Ok(())
    }

    /// 用户充值
    fn process_deposit(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let user = next_account_info(account_info_iter)?;
        let config_account = next_account_info(account_info_iter)?;
        let user_state_account = next_account_info(account_info_iter)?;
        let treasury_account = next_account_info(account_info_iter)?;
        let system_program = next_account_info(account_info_iter)?;

        if !user.is_signer {
            return Err(AgentBondError::Unauthorized.into());
        }

        let config = Config::try_from_slice(&config_account.data.borrow())?;
        if !config.is_initialized {
            return Err(AgentBondError::NotInitialized.into());
        }

        // 验证 treasury 地址
        if config.treasury != treasury_account.key.to_bytes() {
            return Err(AgentBondError::InvalidTreasury.into());
        }

        // 创建/更新 UserState PDA
        let (user_state_pda, user_state_bump) = Pubkey::find_program_address(
            &[UserState::SEED_PREFIX, user.key.as_ref()],
            program_id,
        );

        if user_state_pda != *user_state_account.key {
            return Err(AgentBondError::InvalidInstruction.into());
        }

        let rent = Rent::get()?;

        // 如果 UserState 未初始化则创建
        if user_state_account.data_is_empty() {
            let space = UserState::LEN;
            let lamports = rent.minimum_balance(space);
            invoke_signed(
                &system_instruction::create_account(
                    user.key,
                    user_state_account.key,
                    lamports,
                    space as u64,
                    program_id,
                ),
                &[
                    user.clone(),
                    user_state_account.clone(),
                    system_program.clone(),
                ],
                &[&[UserState::SEED_PREFIX, user.key.as_ref(), &[user_state_bump]]],
            )?;

            let user_state = UserState {
                owner: user.key.to_bytes(),
                total_deposited: amount,
                total_spent: 0,
                total_skills_executed: 0,
                bump: user_state_bump,
                is_initialized: true,
            };
            user_state.serialize(&mut *user_state_account.data.borrow_mut())?;
        } else {
            let mut user_state = UserState::try_from_slice(&user_state_account.data.borrow())?;
            if !user_state.is_initialized {
                return Err(AgentBondError::NotInitialized.into());
            }
            user_state.total_deposited = user_state
                .total_deposited
                .checked_add(amount)
                .ok_or(AgentBondError::MathOverflow)?;
            user_state.serialize(&mut *user_state_account.data.borrow_mut())?;
        }

        // 转账 SOL 到 treasury
        invoke(
            &system_instruction::transfer(user.key, treasury_account.key, amount),
            &[
                user.clone(),
                treasury_account.clone(),
                system_program.clone(),
            ],
        )?;

        msg!("Deposit: {} lamports from {:?}", amount, user.key);
        Ok(())
    }

    /// 调用 Skill（消费 + 增加羁绊）
    fn process_execute_skill(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        agent_id: String,
        cost: u64,
        bond_gain: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let user = next_account_info(account_info_iter)?;
        let config_account = next_account_info(account_info_iter)?;
        let user_state_account = next_account_info(account_info_iter)?;
        let agent_bond_account = next_account_info(account_info_iter)?;
        let treasury_account = next_account_info(account_info_iter)?;
        let system_program = next_account_info(account_info_iter)?;

        if !user.is_signer {
            return Err(AgentBondError::Unauthorized.into());
        }

        if agent_id.len() > AgentBond::MAX_AGENT_ID_LEN {
            return Err(AgentBondError::InvalidAgentIdLength.into());
        }

        let config = Config::try_from_slice(&config_account.data.borrow())?;
        if !config.is_initialized {
            return Err(AgentBondError::NotInitialized.into());
        }
        if config.treasury != treasury_account.key.to_bytes() {
            return Err(AgentBondError::InvalidTreasury.into());
        }

        // 检查用户余额是否足够（从 UserState 读取）
        let mut user_state = UserState::try_from_slice(&user_state_account.data.borrow())?;
        if !user_state.is_initialized {
            return Err(AgentBondError::NotInitialized.into());
        }
        let available = user_state
            .total_deposited
            .saturating_sub(user_state.total_spent);
        if available < cost {
            return Err(AgentBondError::InsufficientBalance.into());
        }

        // 更新 UserState
        user_state.total_spent = user_state
            .total_spent
            .checked_add(cost)
            .ok_or(AgentBondError::MathOverflow)?;
        user_state.total_skills_executed = user_state
            .total_skills_executed
            .checked_add(1)
            .ok_or(AgentBondError::MathOverflow)?;
        user_state.serialize(&mut *user_state_account.data.borrow_mut())?;

        // 创建/更新 AgentBond PDA
        let (agent_bond_pda, agent_bond_bump) = Pubkey::find_program_address(
            &[
                AgentBond::SEED_PREFIX,
                user.key.as_ref(),
                agent_id.as_bytes(),
            ],
            program_id,
        );

        if agent_bond_pda != *agent_bond_account.key {
            return Err(AgentBondError::InvalidInstruction.into());
        }

        if agent_bond_account.data_is_empty() {
            let space = AgentBond::len(&agent_id);
            let rent = Rent::get()?;
            let lamports = rent.minimum_balance(space);
            invoke_signed(
                &system_instruction::create_account(
                    user.key,
                    agent_bond_account.key,
                    lamports,
                    space as u64,
                    program_id,
                ),
                &[
                    user.clone(),
                    agent_bond_account.clone(),
                    system_program.clone(),
                ],
                &[&[
                    AgentBond::SEED_PREFIX,
                    user.key.as_ref(),
                    agent_id.as_bytes(),
                    &[agent_bond_bump],
                ]],
            )?;

            let agent_bond = AgentBond {
                owner: user.key.to_bytes(),
                agent_id: agent_id.clone(),
                bond_value: bond_gain,
                skill_count: 1,
                total_spent: cost,
                bump: agent_bond_bump,
                is_initialized: true,
            };
            agent_bond.serialize(&mut *agent_bond_account.data.borrow_mut())?;
        } else {
            let mut agent_bond =
                AgentBond::try_from_slice(&agent_bond_account.data.borrow())?;
            if !agent_bond.is_initialized {
                return Err(AgentBondError::NotInitialized.into());
            }
            agent_bond.bond_value = agent_bond
                .bond_value
                .checked_add(bond_gain)
                .ok_or(AgentBondError::MathOverflow)?;
            agent_bond.skill_count = agent_bond
                .skill_count
                .checked_add(1)
                .ok_or(AgentBondError::MathOverflow)?;
            agent_bond.total_spent = agent_bond
                .total_spent
                .checked_add(cost)
                .ok_or(AgentBondError::MathOverflow)?;
            agent_bond.serialize(&mut *agent_bond_account.data.borrow_mut())?;
        }

        // 转账 SOL 到 treasury
        invoke(
            &system_instruction::transfer(user.key, treasury_account.key, cost),
            &[
                user.clone(),
                treasury_account.clone(),
                system_program.clone(),
            ],
        )?;

        msg!(
            "ExecuteSkill: agent={}, cost={}, bond_gain={}",
            agent_id,
            cost,
            bond_gain
        );
        Ok(())
    }

    /// 用户提款（从 treasury 退回 SOL）
    fn process_withdraw(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let user = next_account_info(account_info_iter)?;
        let _config_account = next_account_info(account_info_iter)?;
        let user_state_account = next_account_info(account_info_iter)?;
        let treasury_account = next_account_info(account_info_iter)?;
        let user_wallet = next_account_info(account_info_iter)?;
        let _system_program = next_account_info(account_info_iter)?;

        if !user.is_signer {
            return Err(AgentBondError::Unauthorized.into());
        }

        let mut user_state = UserState::try_from_slice(&user_state_account.data.borrow())?;
        if !user_state.is_initialized {
            return Err(AgentBondError::NotInitialized.into());
        }

        let available = user_state
            .total_deposited
            .saturating_sub(user_state.total_spent);
        if available < amount {
            return Err(AgentBondError::InsufficientBalance.into());
        }

        // 记录提款（增加 total_spent 来减少可用余额）
        user_state.total_spent = user_state
            .total_spent
            .checked_add(amount)
            .ok_or(AgentBondError::MathOverflow)?;
        user_state.serialize(&mut *user_state_account.data.borrow_mut())?;

        // 从 treasury 转账给用户
        // treasury 必须是程序的 PDA 或受控账户才能通过 CPI 转出
        // 这里简化处理：treasury 本身需要是程序的 PDA 才能安全提款
        // 实际实现中，treasury 应该是程序控制的 PDA
        invoke(
            &system_instruction::transfer(treasury_account.key, user_wallet.key, amount),
            &[
                treasury_account.clone(),
                user_wallet.clone(),
            ],
        )?;

        msg!("Withdraw: {} lamports to {:?}", amount, user_wallet.key);
        Ok(())
    }
}
