use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::{
    constants::PREDICTION_EVENT_SEEDS_PREFIX, error::Error, events::DeployEvtEvent,
    state::PredictionEvent,
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
            PREDICTION_EVENT_SEEDS_PREFIX,
            id.key().as_ref(),
        ],
        bump,
    )]
    event: Account<'r, PredictionEvent>,

    left_mint: Option<Account<'r, Mint>>,

    right_mint: Option<Account<'r, Mint>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,
}

pub fn handler(
    ctx: Context<DeployEvent>,
    id: Pubkey,
    title: String,
    description: String,
    start_date: u64,
    end_date: u64,
    burning: bool,
) -> Result<()> {
    require!(start_date < end_date, Error::InvalidTime);

    let event = &mut ctx.accounts.event;
    let payer = &ctx.accounts.payer;
    let left_mint = &ctx.accounts.left_mint;
    let right_mint = &ctx.accounts.right_mint;

    event.id = id;
    event.creator = payer.key();
    event.start_date = start_date;
    event.end_date = end_date;
    event.bump = ctx.bumps.event;
    event.burning = burning;

    if let Some(left_mint) = left_mint {
        event.left_mint = Some(left_mint.key());
    }

    if let Some(right_mint) = right_mint {
        event.right_mint = Some(right_mint.key());
    }

    emit!(DeployEvtEvent {
        bump: event.bump,
        creator: event.creator,
        id: event.id,
        key: event.key(),
        description,
        title,
        end_date: event.end_date,
        left_mint: event.left_mint,
        right_mint: event.right_mint,
        start_date: event.start_date,
        burning
    });

    Ok(())
}
