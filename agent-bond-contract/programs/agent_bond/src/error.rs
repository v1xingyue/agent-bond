use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, PartialEq)]
pub enum AgentBondError {
    #[error("Invalid instruction")]
    InvalidInstruction,
    #[error("Not rent exempt")]
    NotRentExempt,
    #[error("Expected amount mismatch")]
    ExpectedAmountMismatch,
    #[error("Amount overflow")]
    AmountOverflow,
    #[error("Insufficient balance")]
    InsufficientBalance,
    #[error("Already initialized")]
    AlreadyInitialized,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Invalid agent ID length")]
    InvalidAgentIdLength,
    #[error("Invalid treasury account")]
    InvalidTreasury,
    #[error("Math overflow")]
    MathOverflow,
    #[error("Account not initialized")]
    NotInitialized,
    #[error("String too long")]
    StringTooLong,
}

impl From<AgentBondError> for ProgramError {
    fn from(e: AgentBondError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
