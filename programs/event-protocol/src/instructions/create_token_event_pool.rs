use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    constants::PREDICTION_EVENT_SEEDS_PREFIX,
    state::{PredictionEvent, Side},
};

#[derive(Accounts)]
#[instruction(_side: Side)]
pub struct CreateTokenEventPool<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref(),
        ],
        bump,
    )]
    event: Account<'r, PredictionEvent>,

    mint: Account<'r, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        seeds = [
            _side.as_pool_seeds_prefix(), 
            event.id.key().as_ref()
        ],
        token::mint = mint,
        token::authority = event,
        bump,
    )]
    pool: Account<'r, TokenAccount>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,
}

pub fn handler(_ctx: Context<CreateTokenEventPool>, _side: Side) -> Result<()> {
    Ok(())
}
