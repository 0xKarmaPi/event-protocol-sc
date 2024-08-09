use anchor_lang::prelude::*;
use anchor_spl::token::Token;

use crate::prediction_event::PredictionEvent;

#[derive(Accounts)]
#[instruction(id:  Pubkey)]
pub struct DeployNNEvent<'r> {
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

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    rent: Sysvar<'r, Rent>,
}

pub fn handler(
    ctx: Context<DeployNNEvent>,
    id: Pubkey,
    title: String,
    description: String,
    end_date: u64,
) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;
    let payer = &ctx.accounts.payer;

    prediction_event.id = id;
    prediction_event.creator = payer.key();
    prediction_event.end_date = end_date;
    prediction_event.title = title;
    prediction_event.description = description;
    prediction_event.bump = ctx.bumps.prediction_event;

    prediction_event.sol_left_pool = Some(0);
    prediction_event.sol_right_pool = Some(0);

    Ok(())
}
