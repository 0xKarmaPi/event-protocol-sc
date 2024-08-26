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

/// The instuction allow predictor to select answer on event
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
        mut,
        constraint = signer_left_ata.mint == event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    signer_left_ata: Option<Account<'r, TokenAccount>>,

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
        constraint = signer_right_ata.mint == event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    signer_right_ata: Option<Account<'r, TokenAccount>>,

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
    ticket.selection = selection;
    ticket.amount += amount;

    let ticket_key = ticket.key();
    let current_amount = ticket.amount;

    let creator = signer.key();
    let event_key = event.key();

    match selection {
        Side::Left => handle_vote_left(ctx, amount)?,
        Side::Right => handle_vote_right(ctx, amount)?,
    };

    emit!(VoteEvtEvent {
        ticket_key,
        event_key,
        creator,
        selection,
        current_amount,
    });

    Ok(())
}

fn handle_vote_left(ctx: Context<VoteEvent>, amount: u64) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let signer = &ctx.accounts.signer;
    let left_mint = ctx.accounts.left_mint.as_ref();

    if left_mint.is_some() {
        let pool = ctx
            .accounts
            .left_pool
            .as_ref()
            .ok_or(Error::MissingLeftPool)?;

        let signer_left_ata = ctx
            .accounts
            .signer_left_ata
            .as_ref()
            .ok_or(Error::MissingSenderAta)?;

        let token_program = &ctx.accounts.token_program;

        pool.take_tokens_from_sender(signer, signer_left_ata, token_program, amount)?;
    } else {
        let system_program = &ctx.accounts.system_program;

        event.take_sols_from_sender(signer, system_program, amount)?;
    }

    event.left_pool += amount;
    Ok(())
}

fn handle_vote_right(ctx: Context<VoteEvent>, amount: u64) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let signer = &ctx.accounts.signer;
    let right_mint = &ctx.accounts.right_mint;

    if right_mint.is_some() {
        let right_pool = ctx
            .accounts
            .right_pool
            .as_ref()
            .ok_or(Error::MissingRightPool)?;

        let right_sender_ata = ctx
            .accounts
            .signer_right_ata
            .as_ref()
            .ok_or(Error::MissingSenderAta)?;

        let token_program = &ctx.accounts.token_program;

        right_pool.take_tokens_from_sender(signer, right_sender_ata, token_program, amount)?;
    } else {
        let system_program = &ctx.accounts.system_program;

        event.take_sols_from_sender(signer, system_program, amount)?;
    }

    event.right_pool += amount;

    Ok(())
}
