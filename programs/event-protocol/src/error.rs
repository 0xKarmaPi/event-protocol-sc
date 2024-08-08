use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Execution error")]
    ExecutionError,

    #[msg("Invalid mint account")]
    InvalidMintError,

    #[msg("This event does not have the left mint and left pool")]
    NonLeftEventError,

    #[msg("Missing left pool")]
    MissingLeftPoolError,

    #[msg("Missing sender's ata")]
    MissingSenderAtaError,

    #[msg("This event does not have sol left pool")]
    LeftEventError,
}
