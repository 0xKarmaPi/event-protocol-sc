use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Master {
    pub address: Pubkey,
    pub bump: u8,
}

impl Master {
    pub const SEED_PREFIX: &'static [u8; 6] = b"master";
}
