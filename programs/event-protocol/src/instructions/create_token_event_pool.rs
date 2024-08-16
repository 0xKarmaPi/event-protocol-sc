use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{constants::PREDICTION_EVENT_SEED_PREFIX, state::PredictionEvent};

#[derive(Accounts)]
#[instruction(_event_id:  Pubkey)]
pub struct CreateTokenEventPool<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        seeds = [
            PREDICTION_EVENT_SEED_PREFIX,
            _event_id.key().as_ref(),
        ],
        bump,
    )]
    event: Account<'r, PredictionEvent>,

    mint: Account<'r, Mint>,

    #[account(
        init,
        payer = signer,
        seeds = [
            
            
            b"left_pool", _event_id.key().as_ref()],
        token::mint = mint,
        token::authority = event,
        bump,
    )]
    pool: Account<'r, TokenAccount>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,
}

pub fn handler(_ctx: Context<CreateTokenEventPool>, _event_id: Pubkey) -> Result<()> {
    Ok(())
}
