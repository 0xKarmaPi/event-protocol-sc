use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)] // automatically calculate the space required for the struct
pub struct PredictionEvent {
    pub id: Pubkey,

    pub creator: Pubkey,

    pub bump: u8,

    pub end_date: u64,

    #[max_len(50)]
    pub title: String,

    #[max_len(144)]
    pub description: String,

    pub left_mint: Pubkey,

    pub right_mint: Pubkey,
}

impl PredictionEvent {
    pub const SEED_PREFIX: &'static [u8; 16] = b"prediction_event";
}
