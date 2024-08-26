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
    events::WithdrawEvent,
    state::{PredictionEvent, PredictionEventAccount, Side, Ticket},
};

#[derive(Accounts)]
pub struct WithdrawDeposited<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref(),
        ],
        bump,
        constraint = event.is_result_set() @ Error::ResultNotSetEvent
    )]
    event: Account<'r, PredictionEvent>,

    #[account(
        mut,
        seeds = [
            TICKET_SEEDS_PREFIX,
            event.result.ok_or(Error::ResultNotSetEvent)?.as_seeds(),
            event.id.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
        constraint = !ticket.withdrawn @ Error::AlreadyWithdrawn
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
    signer_left_beneficiary_ata: Option<Account<'r, TokenAccount>>,

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
    signer_right_beneficiary_ata: Option<Account<'r, TokenAccount>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    associated_token_program: Program<'r, AssociatedToken>,
}

pub fn handler(ctx: Context<WithdrawDeposited>) -> Result<()> {
    let ticket = &mut ctx.accounts.ticket;
    let signer = &ctx.accounts.signer;
    let event = &ctx.accounts.event;
    let token_program = &ctx.accounts.token_program;

    let amount = ticket.amount;
    let result = event.result.ok_or(Error::ResultNotSetEvent)?;

    ticket.withdrawn = true;

    match result {
        Side::Left => {
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
        }
        Side::Right => {
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
        }
    }

    emit!(WithdrawEvent {
        amount,
        event_key: event.key(),
        signer: signer.key(),
        ticket_key: ticket.key(),
    });

    Ok(())
}
