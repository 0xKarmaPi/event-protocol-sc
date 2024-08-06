use anchor_lang::prelude::*;

use crate::prediction_event::PredictionEvent;

#[derive(Accounts)]
pub struct VoteEvent<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    prediction_event: Account<'r, PredictionEvent>,
}

pub fn handler(_ctx: Context<VoteEvent>) -> Result<()> {
    Ok(())
}
