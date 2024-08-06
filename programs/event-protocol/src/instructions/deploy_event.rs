use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

use crate::{
    prediction_event::PredictionEvent, sol_left_pool::SolLeftPool, sol_right_pool::SolRightPool,
};

#[derive(Accounts)]
#[instruction(id:  Pubkey)]
pub struct DeployEvent<'r> {
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

    #[account(
        init,
        space = 8 + SolLeftPool::INIT_SPACE,
        payer = payer,
        seeds = [
            SolLeftPool::SEED_PREFIX,
            id.key().as_ref(),
        ],
        bump,
    )]
    sol_left_pool: Option<Account<'r, SolLeftPool>>,

    #[account(
        init,
        space = 8 + SolRightPool::INIT_SPACE,
        payer = payer,
        seeds = [
            SolRightPool::SEED_PREFIX,
            id.key().as_ref(),
        ],
        bump,
    )]
    sol_right_pool: Option<Account<'r, SolRightPool>>,

    #[account(
        init,
        payer = payer,
        seeds = [b"nonsol_left_pool", id.key().as_ref()],
        token::mint = left_mint,
        token::authority = token_account_owner_pda,
        bump,
    )]
    nonsol_left_pool: Option<Account<'r, TokenAccount>>,

    left_mint: Option<Account<'r, Mint>>,

    system_program: Program<'r, System>,
}

pub fn handler(
    ctx: Context<DeployEvent>,
    id: Pubkey,
    title: String,
    description: String,
    end_date: u64,
    left_mint: Pubkey,
    right_mint: Pubkey,
) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;
    let payer = &ctx.accounts.payer;

    prediction_event.id = id;
    prediction_event.creator = payer.key();
    prediction_event.end_date = end_date;
    prediction_event.title = title;
    prediction_event.description = description;
    prediction_event.left_mint = left_mint;
    prediction_event.right_mint = right_mint;
    prediction_event.bump = ctx.bumps.prediction_event;

    Ok(())
}
