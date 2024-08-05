use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)] // automatically calculate the space required for the struct
pub struct PredictionEvent {
    pub bump: u8,
}

impl PredictionEvent {
    pub const SEED_PREFIX: &'static [u8; 16] = b"prediction_event";
}
