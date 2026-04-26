#[cfg(test)]
mod tests {
    use solana_program::pubkey::Pubkey;
    use solana_program_test::*;
    use solana_sdk::{
        account::Account,
        signature::Keypair,
        transaction::Transaction,
    };
    use solana_sdk::signer::Signer;

    use crate::instruction::AgentBondInstruction;
    use crate::state::{AgentBond, Config, UserState};
    use borsh::BorshDeserialize;

    const PROGRAM_ID: Pubkey = solana_program::pubkey!("AgBoNd1111111111111111111111111111111111111");

    fn program_test() -> ProgramTest {
        let mut pt = ProgramTest::new(
            "agent_bond",
            PROGRAM_ID,
            processor!(crate::process_instruction),
        );
        pt
    }

    #[tokio::test]
    async fn test_full_flow() {
        let mut pt = program_test();

        let admin = Keypair::new();
        let treasury = Keypair::new();
        let user = Keypair::new();

        // Fund accounts
        pt.add_account(
            admin.pubkey(),
            Account::new(10_000_000_000, 0, &solana_program::system_program::id()),
        );
        pt.add_account(
            user.pubkey(),
            Account::new(10_000_000_000, 0, &solana_program::system_program::id()),
        );
        pt.add_account(
            treasury.pubkey(),
            Account::new(1_000_000, 0, &solana_program::system_program::id()),
        );

        let (mut banks_client, payer, recent_blockhash) = pt.start().await;

        // ── 1. Initialize ──────────────────────────────
        let (config_pda, _config_bump) = Pubkey::find_program_address(
            &[Config::SEED_PREFIX],
            &PROGRAM_ID,
        );

        let init_ix = solana_program::instruction::Instruction::new_with_borsh(
            PROGRAM_ID,
            &AgentBondInstruction::Initialize {
                treasury: treasury.pubkey().to_bytes(),
            },
            vec![
                solana_program::instruction::AccountMeta::new(admin.pubkey(), true),
                solana_program::instruction::AccountMeta::new(config_pda, false),
                solana_program::instruction::AccountMeta::new_readonly(
                    solana_program::system_program::id(),
                    false,
                ),
            ],
        );

        let mut tx = Transaction::new_with_payer(&[init_ix], Some(&payer.try_pubkey().unwrap()));
        tx.sign(&[&payer, &admin], recent_blockhash);
        banks_client.process_transaction(tx).await.unwrap();

        // Verify config
        let config_account = banks_client.get_account(config_pda).await.unwrap().unwrap();
        println!("Config lamports: {}", config_account.lamports);
        println!("Config owner: {}", config_account.owner);
        println!("Config data len: {}", config_account.data.len());
        let config = Config::try_from_slice(&config_account.data).unwrap();
        assert!(config.is_initialized);
        assert_eq!(config.admin, admin.pubkey().to_bytes());
        assert_eq!(config.treasury, treasury.pubkey().to_bytes());

        println!("✅ Initialize passed");

        // ── 2. Deposit 0.5 SOL ─────────────────────────
        let deposit_amount: u64 = 500_000_000;
        let (user_state_pda, _user_state_bump) = Pubkey::find_program_address(
            &[UserState::SEED_PREFIX, user.pubkey().as_ref()],
            &PROGRAM_ID,
        );

        let deposit_ix = solana_program::instruction::Instruction::new_with_borsh(
            PROGRAM_ID,
            &AgentBondInstruction::Deposit { amount: deposit_amount },
            vec![
                solana_program::instruction::AccountMeta::new(user.pubkey(), true),
                solana_program::instruction::AccountMeta::new(config_pda, false),
                solana_program::instruction::AccountMeta::new(user_state_pda, false),
                solana_program::instruction::AccountMeta::new(treasury.pubkey(), false),
                solana_program::instruction::AccountMeta::new_readonly(
                    solana_program::system_program::id(),
                    false,
                ),
            ],
        );

        let mut tx2 = Transaction::new_with_payer(&[deposit_ix], Some(&payer.try_pubkey().unwrap()));
        tx2.sign(&[&payer, &user], recent_blockhash);
        banks_client.process_transaction(tx2).await.unwrap();

        // Verify user state
        let user_state_account = banks_client.get_account(user_state_pda).await.unwrap().unwrap();
        let user_state = UserState::try_from_slice(&user_state_account.data).unwrap();
        assert!(user_state.is_initialized);
        assert_eq!(user_state.total_deposited, deposit_amount);
        assert_eq!(user_state.total_spent, 0);

        // Verify treasury received lamports
        let treasury_account = banks_client.get_account(treasury.pubkey()).await.unwrap().unwrap();
        assert!(treasury_account.lamports >= deposit_amount);

        println!("✅ Deposit passed");

        // ── 3. ExecuteSkill ────────────────────────────
        let cost: u64 = 10_000_000;
        let bond_gain: u64 = 30;
        let (agent_bond_pda, _agent_bond_bump) = Pubkey::find_program_address(
            &[
                AgentBond::SEED_PREFIX,
                user.pubkey().as_ref(),
                b"alpha",
            ],
            &PROGRAM_ID,
        );

        let skill_ix = solana_program::instruction::Instruction::new_with_borsh(
            PROGRAM_ID,
            &AgentBondInstruction::ExecuteSkill {
                agent_id: "alpha".to_string(),
                skill_id: "market_analysis".to_string(),
                cost,
                bond_gain,
            },
            vec![
                solana_program::instruction::AccountMeta::new(user.pubkey(), true),
                solana_program::instruction::AccountMeta::new(config_pda, false),
                solana_program::instruction::AccountMeta::new(user_state_pda, false),
                solana_program::instruction::AccountMeta::new(agent_bond_pda, false),
                solana_program::instruction::AccountMeta::new(treasury.pubkey(), false),
                solana_program::instruction::AccountMeta::new_readonly(
                    solana_program::system_program::id(),
                    false,
                ),
            ],
        );

        let mut tx3 = Transaction::new_with_payer(&[skill_ix], Some(&payer.try_pubkey().unwrap()));
        tx3.sign(&[&payer, &user], recent_blockhash);
        banks_client.process_transaction(tx3).await.unwrap();

        // Verify user state updated
        let user_state_account2 = banks_client.get_account(user_state_pda).await.unwrap().unwrap();
        let user_state2 = UserState::try_from_slice(&user_state_account2.data).unwrap();
        assert_eq!(user_state2.total_spent, cost);
        assert_eq!(user_state2.total_skills_executed, 1);

        // Verify agent bond created
        let agent_bond_account = banks_client.get_account(agent_bond_pda).await.unwrap().unwrap();
        let agent_bond = AgentBond::try_from_slice(&agent_bond_account.data).unwrap();
        assert!(agent_bond.is_initialized);
        assert_eq!(agent_bond.agent_id, "alpha");
        assert_eq!(agent_bond.bond_value, bond_gain);
        assert_eq!(agent_bond.skill_count, 1);
        assert_eq!(agent_bond.total_spent, cost);

        println!("✅ ExecuteSkill passed");

        // ── 4. ExecuteSkill again ──────────────────────
        let skill_ix2 = solana_program::instruction::Instruction::new_with_borsh(
            PROGRAM_ID,
            &AgentBondInstruction::ExecuteSkill {
                agent_id: "alpha".to_string(),
                skill_id: "risk_assessment".to_string(),
                cost,
                bond_gain,
            },
            vec![
                solana_program::instruction::AccountMeta::new(user.pubkey(), true),
                solana_program::instruction::AccountMeta::new(config_pda, false),
                solana_program::instruction::AccountMeta::new(user_state_pda, false),
                solana_program::instruction::AccountMeta::new(agent_bond_pda, false),
                solana_program::instruction::AccountMeta::new(treasury.pubkey(), false),
                solana_program::instruction::AccountMeta::new_readonly(
                    solana_program::system_program::id(),
                    false,
                ),
            ],
        );

        let mut tx4 = Transaction::new_with_payer(&[skill_ix2], Some(&payer.try_pubkey().unwrap()));
        tx4.sign(&[&payer, &user], recent_blockhash);
        banks_client.process_transaction(tx4).await.unwrap();

        let agent_bond_account2 = banks_client.get_account(agent_bond_pda).await.unwrap().unwrap();
        let agent_bond2 = AgentBond::try_from_slice(&agent_bond_account2.data).unwrap();
        assert_eq!(agent_bond2.bond_value, bond_gain * 2);
        assert_eq!(agent_bond2.skill_count, 2);
        assert_eq!(agent_bond2.total_spent, cost * 2);

        println!("✅ ExecuteSkill (second) passed");

        println!("\n🎉 All tests passed!");
    }
}
