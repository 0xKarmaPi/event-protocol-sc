use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    constants::{
        PREDICTION_EVENT_SEEDS_PREFIX, TICKET_SEEDS_PREFIX, TOKENS_LEFT_POOL_SEEDS_PREFIX,
        TOKENS_RIGHT_POOL_SEEDS_PREFIX,
    },
    error::Error,
    events::ClaimRewardsEvent,
    state::{PredictionEvent, Ticket},
    Side,
};

#[derive(Accounts)]
pub struct ClaimReward<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref(),
        ],
        bump,
    )]
    event: Account<'r, PredictionEvent>,

    #[account(
        seeds = [
            TICKET_SEEDS_PREFIX,
            event.result.ok_or(Error::NotFinishedEvent)?.as_seeds(),
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
        associated_token::mint = left_mint,
        associated_token::authority = signer,
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
        associated_token::mint = right_mint,
        associated_token::authority = signer,
    )]
    signer_right_ata: Option<Account<'r, TokenAccount>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    associated_token_program: Program<'r, AssociatedToken>,
}

pub fn handler(ctx: Context<ClaimReward>) -> Result<()> {
    let event = &ctx.accounts.event;
    let result = event.result.ok_or(Error::NotFinishedEvent)?;

    match result {
        Side::Left => handle_left_result(ctx)?,
        Side::Right => handle_right_result(ctx)?,
    };

    Ok(())
}

fn handle_left_result(ctx: Context<ClaimReward>) -> Result<()> {
    let ticket = &ctx.accounts.ticket;
    let event = &ctx.accounts.event;
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;

    let bet_amount = ticket.amount;
    let losing_pool = event.right_pool;
    let winning_pool = event.left_pool;

    let amount = bet_amount / winning_pool * losing_pool;

    if event.right_mint.is_some() {
        let right_pool = ctx
            .accounts
            .right_pool
            .as_ref()
            .ok_or(Error::NonRightEvent)?;

        let signer_ata = ctx
            .accounts
            .signer_right_ata
            .as_ref()
            .ok_or(Error::MissingSenderAta)?;

        PredictionEvent::transfer_tokens_from_pool(
            event,
            right_pool,
            signer_ata.to_account_info(),
            amount,
            token_program,
        )?;
    } else {
        event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;
    }

    Ok(())
}

fn handle_right_result(ctx: Context<ClaimReward>) -> Result<()> {
    let ticket = &ctx.accounts.ticket;
    let event = &ctx.accounts.event;
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;

    let bet_amount = ticket.amount;
    let losing_pool = event.left_pool;
    let winning_pool = event.right_pool;

    let amount = bet_amount / winning_pool * losing_pool;

    if event.left_mint.is_some() {
        let left_pool = ctx.accounts.left_pool.as_ref().ok_or(Error::NonLeftEvent)?;

        let signer_ata = ctx
            .accounts
            .signer_left_ata
            .as_ref()
            .ok_or(Error::MissingSenderAta)?;

        PredictionEvent::transfer_tokens_from_pool(
            event,
            left_pool,
            signer_ata.to_account_info(),
            amount,
            token_program,
        )?;
    } else {
        event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;
    }

    emit!(ClaimRewardsEvent {
        event_id: event.id,
        signer: signer.key(),
        amount
    });

    Ok(())
}
