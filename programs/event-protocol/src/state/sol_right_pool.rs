use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct SolRightPool {}

impl SolRightPool {
    pub const SEED_PREFIX: &'static [u8; 14] = b"sol_right_pool";
}
