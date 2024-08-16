use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::{events::DeployEvtEvent, state::PredictionEvent};

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

    if let Some(left_mint) = left_mint {
        prediction_event.left_mint = Some(left_mint.key());
    }

    if let Some(right_mint) = right_mint {
        prediction_event.right_mint = Some(right_mint.key());
    }

    emit!(DeployEvtEvent {
        bump: prediction_event.bump,
        creator: prediction_event.creator,
        id: prediction_event.id,
        key: prediction_event.key(),
        description: prediction_event.description.clone(),
        title: prediction_event.title.clone(),
        end_date: prediction_event.end_date,
        left_mint: prediction_event.left_mint,
        right_mint: prediction_event.right_mint,
        start_date: prediction_event.start_date
    });

    Ok(())
}
