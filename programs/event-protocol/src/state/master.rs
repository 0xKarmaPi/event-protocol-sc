use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Master {
    pub address: Pubkey,
    pub bump: u8,
}
