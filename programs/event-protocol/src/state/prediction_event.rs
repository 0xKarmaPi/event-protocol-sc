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

    pub left_mint: Option<Pubkey>,

    pub right_mint: Option<Pubkey>,

    pub sol_left_pool: Option<u64>,

    pub sol_right_pool: Option<u64>,

    pub left_pool: Option<u64>,

    pub right_pool: Option<u64>,
}

impl PredictionEvent {
    pub const SEED_PREFIX: &'static [u8; 16] = b"prediction_event";
}
