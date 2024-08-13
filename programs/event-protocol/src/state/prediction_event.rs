use anchor_lang::prelude::*;

use super::Selection;

#[account]
#[derive(InitSpace, Debug)]
pub struct PredictionEvent {
    pub id: Pubkey,

    pub creator: Pubkey,

    pub bump: u8,

    pub end_date: u64,

    #[max_len(50)]
    pub title: String,

    #[max_len(144)]
    pub description: String,

    pub left_mint: Option<Pubkey>,

    pub right_mint: Option<Pubkey>,

    pub left_pool: u64,

    pub right_pool: u64,

    pub result: Option<Selection>,
}

impl PredictionEvent {
    pub const SEED_PREFIX: &'static [u8; 16] = b"prediction_event";
}
