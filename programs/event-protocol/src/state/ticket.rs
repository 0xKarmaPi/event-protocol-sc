use anchor_lang::prelude::*;

use crate::constants::{TOKENS_LEFT_POOL_SEEDS_PREFIX, TOKENS_RIGHT_POOL_SEEDS_PREFIX};

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, InitSpace, Debug)]
pub enum Side {
    Left,
    Right,
}

/// The ticket account represents the choice of predictors
#[account]
#[derive(InitSpace)]
pub struct Ticket {
    /// The predictor's wallet pubkey
    pub creator: Pubkey,

    /// The bet amount for the choice
    pub amount: u64,

    /// The choice's side
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
