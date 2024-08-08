use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Execution error")]
    ExecutionError,

    #[msg("Invalid mint account")]
    InvalidMintError,

    #[msg("This event does not have the left mint")]
    NonLeftEventError,
}
