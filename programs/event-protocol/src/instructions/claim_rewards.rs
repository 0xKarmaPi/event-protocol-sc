use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{error::Error, prediction_event::PredictionEvent, Selection, Ticket};

#[derive(Accounts)]
pub struct ClaimReward<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        seeds = [
            PredictionEvent::SEED_PREFIX,
            prediction_event.id.key().as_ref(),
        ],
        bump = prediction_event.bump,
    )]
    prediction_event: Box<Account<'r, PredictionEvent>>,

    #[account(
        seeds = [
            Ticket::SEED_PREFIX,
            prediction_event.result.ok_or(Error::NotFinishedEvent)?.as_seeds(),
            prediction_event.id.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    ticket: Box<Account<'r, Ticket>>,

    #[account(
        constraint = left_mint.key() == prediction_event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    left_mint: Option<Box<Account<'r, Mint>>>,

    #[account(
        mut,
        seeds = [b"left_pool", prediction_event.id.key().as_ref()],
        token::mint = left_mint,
        token::authority = prediction_event,
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
        constraint = right_mint.key() == prediction_event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    right_mint: Option<Box<Account<'r, Mint>>>,

    #[account(
        mut,
        seeds = [b"right_pool", prediction_event.id.key().as_ref()],
        token::mint = right_mint,
        token::authority = prediction_event,
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
    let prediction_event = &ctx.accounts.prediction_event;
    let result = prediction_event.result.ok_or(Error::NotFinishedEvent)?;

    match result {
        Selection::Left => handle_left_result(ctx)?,
        Selection::Right => handle_right_result(ctx)?,
    };

    Ok(())
}

fn handle_left_result(ctx: Context<ClaimReward>) -> Result<()> {
    let ticket = &ctx.accounts.ticket;
    let prediction_event = &ctx.accounts.prediction_event;
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;

    let bet_amount = ticket.amount;
    let losing_pool = prediction_event.right_pool;
    let winning_pool = prediction_event.left_pool;

    let amount = bet_amount / winning_pool * losing_pool;

    if prediction_event.right_mint.is_some() {
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
            prediction_event,
            right_pool,
            signer_ata.to_account_info(),
            amount,
            token_program,
        )?;
    } else {
        prediction_event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;
    }

    Ok(())
}

fn handle_right_result(ctx: Context<ClaimReward>) -> Result<()> {
    let ticket = &ctx.accounts.ticket;
    let prediction_event = &ctx.accounts.prediction_event;
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;

    let bet_amount = ticket.amount;
    let losing_pool = prediction_event.left_pool;
    let winning_pool = prediction_event.right_pool;

    let amount = bet_amount / winning_pool * losing_pool;

    if prediction_event.left_mint.is_some() {
        let left_pool = ctx.accounts.left_pool.as_ref().ok_or(Error::NonLeftEvent)?;

        let signer_ata = ctx
            .accounts
            .signer_left_ata
            .as_ref()
            .ok_or(Error::MissingSenderAta)?;

        PredictionEvent::transfer_tokens(
            prediction_event,
            left_pool,
            signer_ata.to_account_info(),
            amount,
            token_program,
        )?;
    } else {
        prediction_event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;
    }

    Ok(())
}
