use anchor_lang::prelude::*;

/// The master account who authorized person related to the fee system
#[account]
#[derive(InitSpace)]
pub struct Master {
    /// The master's wallet pubkey
    pub address: Pubkey,

    /// The account's canonical bump
    pub bump: u8,
}
