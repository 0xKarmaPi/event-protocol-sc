use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Ticket {
    pub creator: Pubkey,
    pub amount: u64,
}

impl Ticket {
    pub const SEED_PREFIX: &'static [u8; 6] = b"ticket";
}
