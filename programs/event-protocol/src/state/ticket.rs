use anchor_lang::prelude::*;

use crate::constants::{TOKENS_LEFT_POOL_SEEDS_PREFIX, TOKENS_RIGHT_POOL_SEEDS_PREFIX};

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum Side {
    Left,
    Right,
}

#[account]
#[derive(InitSpace)]
pub struct Ticket {
    pub creator: Pubkey,
    pub amount: u64,
    pub selection: Side,
}

impl Side {
    pub fn as_seeds(&self) -> &[u8] {
        match self {
            Self::Left => b"left",
            Self::Right => b"right",
        }
    }

    pub fn as_pool_seeds_prefix(&self) -> &[u8] {
        match self {
            Self::Left => TOKENS_LEFT_POOL_SEEDS_PREFIX,
            Self::Right => TOKENS_RIGHT_POOL_SEEDS_PREFIX,
        }
    }
}
