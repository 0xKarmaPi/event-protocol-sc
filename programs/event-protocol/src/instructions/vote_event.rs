use anchor_lang::{prelude::*, system_program};

use crate::{prediction_event::PredictionEvent, ticket::Ticket};

#[derive(Accounts)]
#[instruction(amount:  u64)]
pub struct VoteEvent<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        mut,
        seeds = [
            PredictionEvent::SEED_PREFIX,
            prediction_event.id.key().as_ref(),
        ],
        bump = prediction_event.bump,
    )]
    prediction_event: Account<'r, PredictionEvent>,

    #[account(
        init_if_needed,
        space = 8 + Ticket::INIT_SPACE,
        payer = signer,
        seeds = [
            Ticket::SEED_PREFIX,
            prediction_event.id.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    ticket: Account<'r, Ticket>,
    system_program: Program<'r, System>,
}

pub fn handler(ctx: Context<VoteEvent>, amount: u64) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;
    let ticket = &mut ctx.accounts.ticket;
    let signer = &ctx.accounts.signer;

    ticket.creator = signer.key();
    ticket.amount += amount;

    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: signer.to_account_info(),
            to: prediction_event.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, amount)?;

    prediction_event.title = "cmm".to_string();

    Ok(())
}
