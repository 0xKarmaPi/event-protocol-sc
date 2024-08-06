use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error")]
    CustomError,

    #[msg("Invalid mint account")]
    InvalidMintError,
}
