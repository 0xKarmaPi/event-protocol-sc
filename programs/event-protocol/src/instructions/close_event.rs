use crate::{
    constants::{
        PREDICTION_EVENT_SEEDS_PREFIX, TOKENS_LEFT_POOL_SEEDS_PREFIX,
        TOKENS_RIGHT_POOL_SEEDS_PREFIX,
    },
    error::Error,
    events::CloseEvtEvent,
    state::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

/// The instuction allow to close event before starting
/// Close the pools token account if either two sides were set non native token instead
#[derive(Accounts)]
pub struct CloseEvent<'r> {
    /// The transaction's signer
    #[account(
        mut,
        constraint = signer.key() == event.creator
    )]
    signer: Signer<'r>,

    /// The prediction event
    #[account(
        mut,
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        bump,
        close = signer,
        constraint = !event.is_started()? @ Error::StartedEvent
    )]
    event: Account<'r, PredictionEvent>,

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

    token_program: Program<'r, Token>,
}

pub fn handler(ctx: Context<CloseEvent>) -> Result<()> {
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;
    let event = &ctx.accounts.event;

    if let Some(left_pool) = ctx.accounts.left_pool.as_ref() {
        event.close_pool(left_pool, signer, token_program)?;
    }

    if let Some(right_pool) = ctx.accounts.right_pool.as_ref() {
        event.close_pool(right_pool, signer, token_program)?;
    }

    emit!(CloseEvtEvent { event_id: event.id });

    Ok(())
}
