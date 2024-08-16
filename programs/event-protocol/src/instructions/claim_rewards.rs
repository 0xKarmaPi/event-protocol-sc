use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    constants::PREDICTION_EVENT_SEED_PREFIX,
    error::Error,
    state::{PredictionEvent, Ticket},
    Selection,
};

#[derive(Accounts)]
pub struct ClaimReward<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        seeds = [
            PREDICTION_EVENT_SEED_PREFIX,
            event.id.key().as_ref(),
        ],
        bump = event.bump,
    )]
    event: Box<Account<'r, PredictionEvent>>,

    #[account(
        seeds = [
            Ticket::SEED_PREFIX,
            event.result.ok_or(Error::NotFinishedEvent)?.as_seeds(),
            event.id.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    ticket: Box<Account<'r, Ticket>>,

    #[account(
        constraint = left_mint.key() == event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    left_mint: Option<Box<Account<'r, Mint>>>,

    #[account(
        mut,
        seeds = [b"left_pool", event.id.key().as_ref()],
        token::mint = left_mint,
        token::authority = event,
        bump,
    )]
    left_pool: Option<Box<Account<'r, TokenAccount>>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = left_mint,
        associated_token::authority = signer,
    )]
    signer_left_ata: Option<Box<Account<'r, TokenAccount>>>,

    #[account(
        constraint = right_mint.key() == event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    right_mint: Option<Box<Account<'r, Mint>>>,

    #[account(
        mut,
        seeds = [b"right_pool", event.id.key().as_ref()],
        token::mint = right_mint,
        token::authority = event,
        bump,
    )]
    right_pool: Option<Box<Account<'r, TokenAccount>>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = right_mint,
        associated_token::authority = signer,
    )]
    signer_right_ata: Option<Box<Account<'r, TokenAccount>>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    associated_token_program: Program<'r, AssociatedToken>,
}

pub fn handler(ctx: Context<ClaimReward>) -> Result<()> {
    let event = &ctx.accounts.event;
    let result = event.result.ok_or(Error::NotFinishedEvent)?;

    match result {
        Selection::Left => handle_left_result(ctx)?,
        Selection::Right => handle_right_result(ctx)?,
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

        PredictionEvent::transfer_tokens(
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

        PredictionEvent::transfer_tokens(
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

    Ok(())
}
