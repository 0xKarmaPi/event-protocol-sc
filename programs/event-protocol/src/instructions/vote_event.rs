use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    constants::{
        PREDICTION_EVENT_SEEDS_PREFIX, TICKET_SEEDS_PREFIX, TOKENS_LEFT_POOL_SEEDS_PREFIX,
        TOKENS_RIGHT_POOL_SEEDS_PREFIX,
    },
    error::Error,
    events::VoteEvtEvent,
    state::{PredictionEvent, PredictionEventAccount, Side, Ticket, TokensPool},
};

#[derive(Accounts)]
#[instruction(selection:  Side)]
pub struct VoteEvent<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        mut,
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref(),
        ],
        bump,
    )]
    event: Account<'r, PredictionEvent>,

    #[account(
        init_if_needed,
        space = 8 + Ticket::INIT_SPACE,
        payer = signer,
        seeds = [
            TICKET_SEEDS_PREFIX,
            selection.as_seeds(),
            event.id.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    ticket: Account<'r, Ticket>,

    #[account(
        constraint = left_mint.key() == event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    left_mint: Option<Account<'r, Mint>>,

    #[account(
        mut,
        constraint = left_sender_ata.mint == event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    left_sender_ata: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            TOKENS_LEFT_POOL_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        token::mint = left_mint,
        token::authority = event,
        bump,
    )]
    left_pool: Option<Account<'r, TokenAccount>>,

    #[account(
        constraint = right_mint.key() == event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    right_mint: Option<Account<'r, Mint>>,

    #[account(
        mut,
        seeds = [
            TOKENS_RIGHT_POOL_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        token::mint = right_mint,
        token::authority = event,
        bump,
    )]
    right_pool: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        constraint = right_sender_ata.mint == event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    right_sender_ata: Option<Account<'r, TokenAccount>>,

    system_program: Program<'r, System>,

    token_program: Program<'r, Token>,
}

pub fn handler(ctx: Context<VoteEvent>, selection: Side, amount: u64) -> Result<()> {
    let ticket = &mut ctx.accounts.ticket;
    let signer = &ctx.accounts.signer;
    let event = &ctx.accounts.event;

    require!(event.is_started()?, Error::NotStartedEvent);
    require!(!event.is_finished()?, Error::FinishedEvent);

    ticket.creator = signer.key();

    ticket.amount += amount;
    ticket.selection = selection;

    let creator = signer.key();
    let event_id = event.id;

    match selection {
        Side::Left => handle_vote_left(ctx, amount)?,
        Side::Right => handle_vote_right(ctx, amount)?,
    };

    emit!(VoteEvtEvent {
        creator,
        event_id,
        amount,
        selection,
    });

    Ok(())
}

fn handle_vote_left(ctx: Context<VoteEvent>, amount: u64) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let signer = &ctx.accounts.signer;
    let left_mint = &ctx.accounts.left_mint;
    let left_pool = &ctx.accounts.left_pool;
    let left_sender_ata = &ctx.accounts.left_sender_ata;

    if left_mint.is_some() {
        let left_pool = left_pool.as_ref().ok_or(Error::MissingLeftPool)?;

        let left_sender_ata = left_sender_ata.as_ref().ok_or(Error::MissingSenderAta)?;

        let token_program = &ctx.accounts.token_program;

        left_pool.take_tokens_from_sender(signer, left_sender_ata, token_program, amount)?;

        event.left_pool += amount;
    } else {
        let system_program = &ctx.accounts.system_program;

        event.take_sols_from_sender(signer, system_program, amount)?;

        event.left_pool += amount;
    }

    Ok(())
}

fn handle_vote_right(ctx: Context<VoteEvent>, amount: u64) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let signer = &ctx.accounts.signer;
    let right_mint = &ctx.accounts.right_mint;
    let right_pool = &ctx.accounts.right_pool;
    let right_sender_ata = &ctx.accounts.right_sender_ata;

    if right_mint.is_some() {
        let right_pool = right_pool.as_ref().ok_or(Error::NonRightEvent)?;

        let right_sender_ata = right_sender_ata.as_ref().ok_or(Error::MissingSenderAta)?;

        let token_program = &ctx.accounts.token_program;

        right_pool.take_tokens_from_sender(signer, right_sender_ata, token_program, amount)?;

        event.right_pool += amount;
    } else {
        let system_program = &ctx.accounts.system_program;

        event.take_sols_from_sender(signer, system_program, amount)?;

        event.right_pool += amount;
    }

    Ok(())
}
