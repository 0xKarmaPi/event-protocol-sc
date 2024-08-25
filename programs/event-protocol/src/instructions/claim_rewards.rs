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
    state::{PredictionEvent, PredictionEventAccount, Ticket},
    Side,
};

/// The instuction allows the winning side to claim tokens from losing side
#[derive(Accounts)]
pub struct ClaimReward<'r> {
    /// The transaction's signer
    #[account(mut)]
    signer: Signer<'r>,

    /// The prediction event
    #[account(
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref(),
        ],
        bump,
        constraint = !event.burning @ Error::BurningEvent,
        constraint = event.is_result_set() @ Error::ResultNotSetEvent
    )]
    event: Account<'r, PredictionEvent>,

    /// The ticket of signer on the above event
    #[account(
        mut,
        seeds = [
            TICKET_SEEDS_PREFIX,
            event.result.ok_or(Error::ResultNotSetEvent)?.as_seeds(),
            event.id.key().as_ref(),
            signer.key().as_ref()
        ],
        bump,
        constraint = !ticket.claimed @ Error::AlreadyClaimed
    )]
    ticket: Account<'r, Ticket>,

    /// The mint of the event's token left side
    #[account(
        constraint = left_mint.key() == event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    left_mint: Option<Account<'r, Mint>>,

    /// The token account that contains the left side tokens
    #[account(
        mut,
        seeds = [
            TOKENS_LEFT_POOL_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        token::mint = left_mint,
        token::authority = event,
        bump
    )]
    left_pool: Option<Account<'r, TokenAccount>>,

    /// The signer's associated token account of left mint
    #[account(
        mut,
        associated_token::mint = left_mint,
        associated_token::authority = signer
    )]
    signer_left_beneficiary_ata: Option<Account<'r, TokenAccount>>,

    /// The mint of the event's token right side
    #[account(
        constraint = right_mint.key() == event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    right_mint: Option<Account<'r, Mint>>,

    /// The token account that contains the right side tokens
    #[account(
        mut,
        seeds = [
            TOKENS_RIGHT_POOL_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        token::mint = right_mint,
        token::authority = event,
        bump
    )]
    right_pool: Option<Account<'r, TokenAccount>>,

    /// The optional signer's associated token account of right mint
    #[account(
        mut,
        associated_token::mint = right_mint,
        associated_token::authority = signer
    )]
    signer_right_beneficiary_ata: Option<Account<'r, TokenAccount>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    associated_token_program: Program<'r, AssociatedToken>,
}

pub fn handler(ctx: Context<ClaimReward>) -> Result<()> {
    let event = &ctx.accounts.event;
    let result = event.result.ok_or(Error::NotFinishedEvent)?;

    let ticket = &mut ctx.accounts.ticket;
    ticket.claimed = true;

    match result {
        Side::Left => handle_left_result(ctx)?,
        Side::Right => handle_right_result(ctx)?,
    };

    Ok(())
}

fn handle_left_result(ctx: Context<ClaimReward>) -> Result<()> {
    let event = &ctx.accounts.event;
    let signer = &ctx.accounts.signer;

    let bet_amount = ctx.accounts.ticket.amount;
    let losing_pool = event.right_pool;
    let winning_pool = event.left_pool;

    let amount = bet_amount * 100_000 / winning_pool * losing_pool / 100_000;

    if event.right_mint.is_some() {
        let pool = ctx
            .accounts
            .right_pool
            .as_ref()
            .ok_or(Error::MissingRightPool)?;

        let signer_beneficiary_ata = ctx
            .accounts
            .signer_right_beneficiary_ata
            .as_ref()
            .ok_or(Error::MissingSenderAta)?;

        let token_program = &ctx.accounts.token_program;

        event.transfer_tokens_from_pool(
            pool,
            signer_beneficiary_ata.to_account_info(),
            token_program,
            amount,
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

fn handle_right_result(ctx: Context<ClaimReward>) -> Result<()> {
    let event = &ctx.accounts.event;
    let signer = &ctx.accounts.signer;

    let bet_amount = ctx.accounts.ticket.amount;
    let losing_pool = event.left_pool;
    let winning_pool = event.right_pool;

    let amount = bet_amount * 100_000 / winning_pool * losing_pool / 100_000;

    if event.left_mint.is_some() {
        let pool = ctx
            .accounts
            .left_pool
            .as_ref()
            .ok_or(Error::MissingLeftPool)?;

        let signer_beneficiary_ata = ctx
            .accounts
            .signer_left_beneficiary_ata
            .as_ref()
            .ok_or(Error::MissingSenderAta)?;

        let token_program = &ctx.accounts.token_program;

        event.transfer_tokens_from_pool(
            pool,
            signer_beneficiary_ata.to_account_info(),
            token_program,
            amount,
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
