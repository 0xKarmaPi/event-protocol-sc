use anchor_lang::prelude::*;

use crate::prediction_event::PredictionEvent;

#[derive(Accounts)]
pub struct DeployEvent<'r> {
    #[account(mut)]
    payer: Signer<'r>,

    #[account(
        init,
        space = 8 + PredictionEvent::INIT_SPACE,
        payer = payer,
        seeds = [
            PredictionEvent::SEED_PREFIX,
            payer.key().as_ref(),
        ],
        bump,
    )]
    prediction_event: Account<'r, PredictionEvent>,

    system_program: Program<'r, System>,
}

pub fn handler(ctx: Context<DeployEvent>) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;

    prediction_event.bump = ctx.bumps.prediction_event;

    Ok(())
}
