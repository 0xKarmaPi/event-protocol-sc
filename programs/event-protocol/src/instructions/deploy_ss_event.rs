use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::prediction_event::PredictionEvent;

#[derive(Accounts)]
#[instruction(id:  Pubkey)]
pub struct DeploySSEvent<'r> {
    #[account(mut)]
    payer: Signer<'r>,

    #[account(
        init,
        space = 8 + PredictionEvent::INIT_SPACE,
        payer = payer,
        seeds = [
            PredictionEvent::SEED_PREFIX,
            id.key().as_ref(),
        ],
        bump,
    )]
    prediction_event: Account<'r, PredictionEvent>,

    left_mint: Account<'r, Mint>,

    #[account(
      init,
      payer = payer,
      seeds = [b"left_pool", id.key().as_ref()],
      token::mint = left_mint,
      token::authority = prediction_event,
      bump,
    )]
    left_pool: Account<'r, TokenAccount>,

    right_mint: Account<'r, Mint>,

    #[account(
        init,
        payer = payer,
        seeds = [b"right_pool", id.key().as_ref()],
        token::mint = right_mint,
        token::authority = prediction_event,
        bump,
      )]
    right_pool: Account<'r, TokenAccount>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    rent: Sysvar<'r, Rent>,
}

pub fn handler(
    ctx: Context<DeploySSEvent>,
    id: Pubkey,
    title: String,
    description: String,
    end_date: u64,
) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;
    let payer = &ctx.accounts.payer;
    let left_mint = &ctx.accounts.left_mint;
    let right_mint = &ctx.accounts.right_mint;

    prediction_event.id = id;
    prediction_event.creator = payer.key();
    prediction_event.end_date = end_date;
    prediction_event.title = title;
    prediction_event.description = description;
    prediction_event.bump = ctx.bumps.prediction_event;

    prediction_event.left_mint = Some(left_mint.key());
    prediction_event.left_pool = Some(0);

    prediction_event.right_mint = Some(right_mint.key());
    prediction_event.right_pool = Some(0);

    Ok(())
}
