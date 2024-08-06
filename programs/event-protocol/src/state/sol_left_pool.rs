use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct SolLeftPool {}

impl SolLeftPool {
    pub const SEED_PREFIX: &'static [u8; 13] = b"sol_left_pool";
}
