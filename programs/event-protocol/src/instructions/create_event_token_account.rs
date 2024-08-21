use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    constants::PREDICTION_EVENT_SEEDS_PREFIX,
    state::{PredictionEvent, Side},
};

/// The instruction is a part of the deploy_event instruction
/// It allow to create pool token account to hold tokens from two sides 
/// We need to break it down from the deploy_event instruction because of anchor limited stack issue
#[derive(Accounts)]
#[instruction(_side: Side)]
pub struct CreateEventTokenAccount<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        bump
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
        bump
    )]
    pool: Account<'r, TokenAccount>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,
}

pub fn handler(_ctx: Context<CreateEventTokenAccount>, _side: Side) -> Result<()> {
    Ok(())
}
